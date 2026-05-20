"""IPCC AR6 compound vulnerability scoring.

Combines flood hazard with SRHR health vulnerability to identify
areas where climate disaster intersects poor health outcomes.
"""

import numpy as np


# Post-flood disease amplification factors
# Based on epidemiological literature for Nigeria
DISEASE_AMPLIFIERS = {
    "cholera": {"multiplier": 3.5, "peak_days": (3, 14)},
    "malaria": {"multiplier": 2.0, "peak_days": (14, 42)},
    "diarrheal": {"multiplier": 2.8, "peak_days": (1, 7)},
    "typhoid": {"multiplier": 2.0, "peak_days": (7, 21)},
    "skin_infections": {"multiplier": 1.5, "peak_days": (3, 14)},
}


def compute_compound_risk(
    flood_risk: float,
    health_vulnerability: float,
    exposure: float,
    adaptive_capacity: float,
) -> dict:
    """Compute IPCC AR6 compound vulnerability score.

    Args:
        flood_risk: 0-1 flood hazard probability.
        health_vulnerability: 0-1 IRIX health risk score.
        exposure: 0-1 population exposure (people in flood-prone areas).
        adaptive_capacity: 0-1 healthcare system capacity.

    Returns:
        Dict with compound score, components, and risk level.
    """
    # IPCC framework weighted combination
    compound = (
        0.35 * flood_risk
        + 0.30 * health_vulnerability
        + 0.20 * exposure
        + 0.15 * (1 - adaptive_capacity)
    )

    # Interaction boost: areas with BOTH high flood and health risk
    interaction = flood_risk * health_vulnerability * 0.2
    compound = min(1.0, compound + interaction)

    # Risk classification
    if compound >= 0.8:
        risk_level = "critical"
    elif compound >= 0.6:
        risk_level = "high"
    elif compound >= 0.4:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "compound_score": round(compound, 4),
        "risk_level": risk_level,
        "components": {
            "flood_hazard": round(flood_risk, 4),
            "health_vulnerability": round(health_vulnerability, 4),
            "exposure": round(exposure, 4),
            "adaptive_capacity": round(adaptive_capacity, 4),
            "interaction_boost": round(interaction, 4),
        },
    }


def compute_post_flood_health_risk(
    flood_risk: float,
    days_since_flood: int,
    baseline_health_risk: float,
) -> dict:
    """Estimate post-flood disease amplification.

    Models how disease risk changes in the days/weeks after flooding.
    """
    amplified_risks = {}

    for disease, params in DISEASE_AMPLIFIERS.items():
        peak_start, peak_end = params["peak_days"]
        multiplier = params["multiplier"]

        if peak_start <= days_since_flood <= peak_end:
            # Within peak window — full amplification
            progress = (days_since_flood - peak_start) / (peak_end - peak_start)
            # Bell curve within window
            curve = np.sin(progress * np.pi)
            effective_multiplier = 1 + (multiplier - 1) * curve * flood_risk
        elif days_since_flood < peak_start:
            # Before peak — ramping up
            effective_multiplier = 1 + (multiplier - 1) * 0.3 * flood_risk
        else:
            # After peak — decaying
            decay = max(0, 1 - (days_since_flood - peak_end) / 30)
            effective_multiplier = 1 + (multiplier - 1) * 0.2 * decay * flood_risk

        amplified_risk = min(1.0, baseline_health_risk * effective_multiplier)
        amplified_risks[disease] = {
            "risk": round(amplified_risk, 4),
            "multiplier": round(effective_multiplier, 2),
            "in_peak_window": peak_start <= days_since_flood <= peak_end,
        }

    return {
        "days_since_flood": days_since_flood,
        "baseline_risk": round(baseline_health_risk, 4),
        "amplified_risks": amplified_risks,
    }


def batch_compound_risk(
    lga_data: list[dict],
) -> list[dict]:
    """Compute compound risk for multiple LGAs.

    Each dict in lga_data should have: lga_id, flood_risk,
    health_vulnerability, exposure, adaptive_capacity.
    """
    results = []
    for lga in lga_data:
        risk = compute_compound_risk(
            flood_risk=lga.get("flood_risk", 0),
            health_vulnerability=lga.get("health_vulnerability", 0),
            exposure=lga.get("exposure", 0.5),
            adaptive_capacity=lga.get("adaptive_capacity", 0.5),
        )
        results.append({"lga_id": lga["lga_id"], **risk})
    return results
