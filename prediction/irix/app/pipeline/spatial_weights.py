"""Spatial weights construction for BYM2 model.

Uses queen contiguity based on H3 hexagonal grid adjacency.
The adjacency structure is fed to PyMC's ICAR prior.
"""

import numpy as np
import pandas as pd
from libpysal.weights import W
from scipy.sparse import csr_matrix

from app.pipeline.aggregation import get_h3_neighbors


def build_h3_adjacency(h3_indices: list[str]) -> W:
    """Build a queen contiguity spatial weights matrix from H3 cell indices.

    Each H3 cell is connected to its k=1 ring neighbors (6 neighbors for
    interior cells, fewer for edge cells).
    """
    index_set = set(h3_indices)
    neighbors: dict[str, list[str]] = {}

    for h3_idx in h3_indices:
        ring = get_h3_neighbors(h3_idx)
        # Only include neighbors that are in our study area
        neighbors[h3_idx] = [n for n in ring if n in index_set]

    return W(neighbors)


def weights_to_adjacency_matrix(w: W) -> np.ndarray:
    """Convert libpysal weights to a dense adjacency matrix for PyMC ICAR."""
    n = w.n
    adj = np.zeros((n, n), dtype=np.float64)

    id_to_idx = {id_: i for i, id_ in enumerate(w.id_order)}

    for id_, neighbors in w.neighbors.items():
        i = id_to_idx[id_]
        for neighbor in neighbors:
            j = id_to_idx[neighbor]
            adj[i, j] = 1.0

    return adj


def weights_to_sparse(w: W) -> tuple[np.ndarray, np.ndarray, int]:
    """Convert weights to node1/node2 arrays for PyMC ICAR prior.

    Returns:
        node1: array of source indices (0-based)
        node2: array of target indices (0-based)
        n_edges: number of edges
    """
    id_to_idx = {id_: i for i, id_ in enumerate(w.id_order)}
    node1 = []
    node2 = []

    for id_, neighbors in w.neighbors.items():
        i = id_to_idx[id_]
        for neighbor in neighbors:
            j = id_to_idx[neighbor]
            if i < j:  # Avoid duplicates (undirected graph)
                node1.append(i)
                node2.append(j)

    return np.array(node1), np.array(node2), len(node1)
