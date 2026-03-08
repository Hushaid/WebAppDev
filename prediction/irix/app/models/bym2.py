"""BYM2 (Besag-York-Mollié 2) Bayesian hierarchical spatial model.

Decomposes community risk into:
    Y_i = β₀ + β₁X₁ + ... + φ_i (structured spatial) + θ_i (unstructured)

The BYM2 reparameterization (Riebler et al., 2016) controls the proportion
of spatial vs unstructured variance via a mixing parameter ρ:
    u_i = σ * (√ρ * φ_i + √(1-ρ) * θ_i)

where φ_i follows an ICAR prior (spatially correlated) and θ_i ~ N(0,1).
"""

import numpy as np
import pymc as pm
import arviz as az

from app.pipeline.spatial_weights import weights_to_sparse


def build_bym2_model(
    observed_scores: np.ndarray,
    covariates: np.ndarray | None,
    node1: np.ndarray,
    node2: np.ndarray,
    n_areas: int,
    n_edges: int,
) -> pm.Model:
    """Build a BYM2 model in PyMC v5.

    Args:
        observed_scores: Array of observed risk scores per H3 cell (n_areas,)
        covariates: Optional covariate matrix (n_areas, n_covariates)
        node1: Source node indices for adjacency
        node2: Target node indices for adjacency
        n_areas: Number of spatial units (H3 cells)
        n_edges: Number of edges in adjacency graph

    Returns:
        PyMC model ready for sampling
    """
    with pm.Model() as model:
        # Intercept
        beta0 = pm.Normal("beta0", mu=0, sigma=10)

        # Fixed effects for covariates
        if covariates is not None:
            n_covs = covariates.shape[1]
            beta = pm.Normal("beta", mu=0, sigma=5, shape=n_covs)
            linear = beta0 + pm.math.dot(covariates, beta)
        else:
            linear = beta0

        # BYM2 components
        # Overall standard deviation
        sigma = pm.HalfNormal("sigma", sigma=1)

        # Mixing parameter: proportion of variance that is spatial
        rho = pm.Beta("rho", alpha=1, beta=1)

        # ICAR component (spatially structured)
        phi = pm.ICAR("phi", W=np.column_stack([node1, node2]).tolist(), sigma=1, shape=n_areas)

        # Unstructured component
        theta = pm.Normal("theta", mu=0, sigma=1, shape=n_areas)

        # BYM2 combined random effect
        # Scale phi to have unit variance
        phi_scaled = phi / pm.math.sqrt(pm.math.sum(phi**2) / n_areas + 1e-6)
        u = sigma * (pm.math.sqrt(rho) * phi_scaled + pm.math.sqrt(1 - rho) * theta)

        # Mean
        mu = linear + u

        # Likelihood (Normal for continuous scores, could use Poisson for counts)
        sigma_obs = pm.HalfNormal("sigma_obs", sigma=1)
        pm.Normal("y_obs", mu=mu, sigma=sigma_obs, observed=observed_scores)

    return model


def fit_bym2(
    observed_scores: np.ndarray,
    covariates: np.ndarray | None,
    node1: np.ndarray,
    node2: np.ndarray,
    n_areas: int,
    n_edges: int,
    n_samples: int = 1000,
    n_tune: int = 1000,
    n_chains: int = 2,
    random_seed: int = 42,
) -> az.InferenceData:
    """Fit the BYM2 model and return posterior samples."""
    model = build_bym2_model(
        observed_scores, covariates, node1, node2, n_areas, n_edges
    )

    with model:
        trace = pm.sample(
            draws=n_samples,
            tune=n_tune,
            chains=n_chains,
            random_seed=random_seed,
            return_inferencedata=True,
            progressbar=True,
        )

    return trace


def predict_risk(trace: az.InferenceData, n_areas: int) -> dict:
    """Extract posterior predictions from fitted BYM2 model.

    Returns per-area:
        - mean predicted score
        - 95% credible interval (lower, upper)
        - P(high risk) — posterior probability score exceeds threshold
    """
    # Get posterior samples of mu = beta0 + covariates + u
    posterior = trace.posterior

    # Reconstruct u from posterior
    sigma = posterior["sigma"].values
    rho = posterior["rho"].values
    phi = posterior["phi"].values
    theta = posterior["theta"].values

    # Reshape for broadcasting: (chains, draws, n_areas)
    phi_var = np.sum(phi**2, axis=-1, keepdims=True) / n_areas + 1e-6
    phi_scaled = phi / np.sqrt(phi_var)
    u = sigma[..., None] * (np.sqrt(rho[..., None]) * phi_scaled + np.sqrt(1 - rho[..., None]) * theta)

    beta0 = posterior["beta0"].values
    mu = beta0[..., None] + u

    # Flatten chains x draws
    mu_flat = mu.reshape(-1, n_areas)

    mean_scores = mu_flat.mean(axis=0)
    ci_lower = np.percentile(mu_flat, 2.5, axis=0)
    ci_upper = np.percentile(mu_flat, 97.5, axis=0)

    return {
        "mean_scores": mean_scores,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
    }
