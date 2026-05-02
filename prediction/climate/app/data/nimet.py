"""NIMET rainfall CSV parser.

Converts NIMET's wide-format daily rainfall CSV (years as columns) into
long-format records for the flood prediction pipeline.

Expected input format:
    Row 1: title row ("RAINFALL (mm),,,")
    Row 2: headers (Month, DAY, 2021, 2022, ...)
    Subsequent rows: month abbreviation, day number, rainfall values per year
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


def parse_nimet_rainfall(filepath: str) -> pd.DataFrame:
    """Parse NIMET wide-format daily rainfall CSV to long format.

    Returns DataFrame with columns:
        date (datetime.date), lga_name, latitude, longitude, rainfall_mm
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
            val = str(row[year_col]).strip()

            if val in ("*", "", "nan"):
                continue

            try:
                d = date(year, month_num, day)
            except ValueError:
                continue

            try:
                rainfall = float(val)
            except (ValueError, TypeError):
                continue

            rows.append({
                "date": d,
                "lga_name": KARU_LGA,
                "latitude": KARU_COORDS["lat"],
                "longitude": KARU_COORDS["lon"],
                "rainfall_mm": rainfall,
            })

    result = pd.DataFrame(rows)
    if not result.empty:
        result = result.sort_values("date").reset_index(drop=True)
    return result


def compute_rolling_windows(
    df: pd.DataFrame,
    windows: list[int] = [1, 3, 7, 14, 30],
) -> pd.DataFrame:
    """Add cumulative rolling rainfall window columns to a parsed NIMET DataFrame.

    Missing days (dry days omitted from CSV) are filled with 0 before rolling.

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


def load_nimet_features(filepath: str) -> dict[str, float]:
    """Return latest rain_* feature dict for Karu LGA.

    Convenience wrapper for pipeline integration — returns the most recent
    day's rolling window values ready to merge into build_dynamic_features().
    """
    df = parse_nimet_rainfall(filepath)
    if df.empty:
        return {}

    df_windows = compute_rolling_windows(df)
    latest = df_windows.iloc[-1]

    return {
        "rain_1d": float(latest["rain_1d"]),
        "rain_3d": float(latest["rain_3d"]),
        "rain_7d": float(latest["rain_7d"]),
        "rain_14d": float(latest["rain_14d"]),
        "rain_30d": float(latest["rain_30d"]),
    }
