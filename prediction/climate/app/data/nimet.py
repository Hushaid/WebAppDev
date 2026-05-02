"""NIMET rainfall and evapotranspiration CSV parser.

Converts NIMET's wide-format daily CSVs (years as columns) into long-format
records for the flood prediction pipeline.

Expected input format (both rainfall and ET files):
    Row 1: title row ("RAINFALL (mm),,," or "EVAPOTRANSPIRATION(mm),,,")
    Row 2: headers (Month, DAY, 2021, 2022, ...)
    Subsequent rows: month abbreviation, day number, values per year
    '*' denotes a non-existent date (e.g. Feb 29 on non-leap years)
    Empty cells denote missing/future data
"""

from datetime import date

import pandas as pd

MONTH_MAP = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
    "May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
    "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

# Karu LGA, Nasarawa State
KARU_LGA = "Karu"
KARU_COORDS = {"lat": 8.75, "lon": 7.65}


def _parse_wide_csv(filepath: str, value_col: str) -> pd.DataFrame:
    """Core parser for any NIMET wide-format CSV (rainfall, ET, etc.).

    Returns long-format DataFrame with columns: date, lga_name, {value_col}.
    """
    df = pd.read_csv(filepath, skiprows=1)
    df.columns = df.columns.str.strip()
    df = df.rename(columns={"Month": "month", "DAY": "day"})

    year_cols = [c for c in df.columns if str(c).strip().isdigit()]

    rows = []
    for _, row in df.iterrows():
        month_str = str(row["month"]).strip()
        if month_str not in MONTH_MAP:
            continue
        month_num = MONTH_MAP[month_str]

        try:
            day = int(row["day"])
        except (ValueError, TypeError):
            continue

        for year_col in year_cols:
            year = int(year_col)
            # Strip any Excel formula artifacts (e.g. "0.23+D13:D61708")
            raw = str(row[year_col]).strip().split("+")[0]

            if raw in ("*", "", "nan"):
                continue

            try:
                d = date(year, month_num, day)
            except ValueError:
                continue

            try:
                value = float(raw)
            except (ValueError, TypeError):
                continue

            rows.append({
                "date": d,
                "lga_name": KARU_LGA,
                "latitude": KARU_COORDS["lat"],
                "longitude": KARU_COORDS["lon"],
                value_col: value,
            })

    result = pd.DataFrame(rows)
    if not result.empty:
        result = result.sort_values("date").reset_index(drop=True)
    return result


def parse_nimet_rainfall(filepath: str) -> pd.DataFrame:
    """Parse NIMET wide-format daily rainfall CSV to long format.

    Returns DataFrame with columns:
        date, lga_name, latitude, longitude, rainfall_mm
    """
    return _parse_wide_csv(filepath, "rainfall_mm")


def parse_nimet_et(filepath: str) -> pd.DataFrame:
    """Parse NIMET wide-format daily evapotranspiration CSV to long format.

    Returns DataFrame with columns:
        date, lga_name, latitude, longitude, et_mm
    """
    return _parse_wide_csv(filepath, "et_mm")


def compute_rolling_windows(
    df: pd.DataFrame,
    windows: list[int] = [1, 3, 7, 14, 30],
) -> pd.DataFrame:
    """Add cumulative rolling rainfall window columns to a parsed NIMET DataFrame.

    Missing days are filled with 0 before rolling.
    Returns DataFrame with rain_1d, rain_3d, rain_7d, rain_14d, rain_30d columns.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()

    full_range = pd.date_range(df.index.min(), df.index.max(), freq="D")
    df = df.reindex(full_range)
    df["rainfall_mm"] = df["rainfall_mm"].fillna(0)
    df["lga_name"] = df["lga_name"].fillna(KARU_LGA)
    df["latitude"] = df["latitude"].fillna(KARU_COORDS["lat"])
    df["longitude"] = df["longitude"].fillna(KARU_COORDS["lon"])

    for w in windows:
        df[f"rain_{w}d"] = df["rainfall_mm"].rolling(window=w, min_periods=1).sum()

    return df.reset_index().rename(columns={"index": "date"})


def merge_rainfall_et(
    rainfall_filepath: str,
    et_filepath: str,
    windows: list[int] = [7, 30],
) -> pd.DataFrame:
    """Merge rainfall and ET into a combined daily DataFrame with water balance features.

    Water balance = cumulative rainfall - cumulative ET over the same window.
    Positive = more water coming in than leaving → soil accumulating moisture.
    Negative = more evaporation than rain → drying out.

    Added columns beyond rainfall windows:
        et_7d, et_30d               — cumulative ET
        water_balance_7d            — rain_7d - et_7d  (primary soil saturation proxy)
        water_balance_30d           — rain_30d - et_30d (antecedent condition)
        soil_moisture_proxy         — normalised water_balance_30d mapped to [0, 1]
    """
    rain_df = parse_nimet_rainfall(rainfall_filepath)
    et_df   = parse_nimet_et(et_filepath)

    rain_windows = compute_rolling_windows(rain_df, windows=[1, 3, 7, 14, 30])

    # ET rolling sums
    et_df["date"] = pd.to_datetime(et_df["date"])
    et_long = (
        et_df.set_index("date")[["et_mm"]]
        .reindex(pd.date_range(et_df["date"].min(), et_df["date"].max(), freq="D"))
        .ffill()   # forward-fill single missing ET days
        .fillna(0)
    )
    for w in windows:
        et_long[f"et_{w}d"] = et_long["et_mm"].rolling(w, min_periods=1).sum()
    et_long = et_long.reset_index().rename(columns={"index": "date"})

    merged = rain_windows.merge(et_long[["date", "et_mm", "et_7d", "et_30d"]], on="date", how="left")
    merged["et_mm"]   = merged["et_mm"].fillna(0)
    merged["et_7d"]   = merged["et_7d"].fillna(0)
    merged["et_30d"]  = merged["et_30d"].fillna(0)

    merged["water_balance_7d"]  = merged["rain_7d"]  - merged["et_7d"]
    merged["water_balance_30d"] = merged["rain_30d"] - merged["et_30d"]

    # Soil moisture proxy: sigmoid-scaled 30-day water balance
    # 0 = very dry (large ET deficit), 1 = saturated (large rainfall surplus)
    wb30 = merged["water_balance_30d"]
    merged["soil_moisture_proxy"] = 1 / (1 + (-wb30 / 50).apply(lambda x: __import__("math").exp(x)))

    return merged


def load_nimet_features(
    rainfall_filepath: str,
    et_filepath: str | None = None,
) -> dict[str, float]:
    """Return latest feature dict for Karu LGA, ready for build_dynamic_features().

    If et_filepath is provided, replaces the flat soil_moisture default with
    a real ET-derived soil moisture proxy.
    """
    if et_filepath:
        df = merge_rainfall_et(rainfall_filepath, et_filepath)
        latest = df.iloc[-1]
        return {
            "rain_1d":            float(latest["rain_1d"]),
            "rain_3d":            float(latest["rain_3d"]),
            "rain_7d":            float(latest["rain_7d"]),
            "rain_14d":           float(latest["rain_14d"]),
            "rain_30d":           float(latest["rain_30d"]),
            "soil_moisture":      float(latest["soil_moisture_proxy"]),
            "water_balance_7d":   float(latest["water_balance_7d"]),
            "water_balance_30d":  float(latest["water_balance_30d"]),
        }

    rain_df = parse_nimet_rainfall(rainfall_filepath)
    df = compute_rolling_windows(rain_df)
    latest = df.iloc[-1]
    return {
        "rain_1d":   float(latest["rain_1d"]),
        "rain_3d":   float(latest["rain_3d"]),
        "rain_7d":   float(latest["rain_7d"]),
        "rain_14d":  float(latest["rain_14d"]),
        "rain_30d":  float(latest["rain_30d"]),
        "soil_moisture": 0.35,
    }
