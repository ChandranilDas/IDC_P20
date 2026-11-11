"""
diagnostics.py
Quantitative physical diagnostics for 1D and 2D TDGL simulations.

Tracks:
    - Mean order parameter <phi>(t)
    - Mean square <phi^2>(t)
    - Min and Max phi(t)
    - Total Ginzburg-Landau Free Energy F(t)
"""

from typing import Dict, Any
import numpy as np
from src.tdgl_core import free_energy_1d, free_energy_2d


def compute_diagnostics_1d(phi: np.ndarray, dx: float) -> Dict[str, float]:
    """Calculate 1D spatial diagnostics for current field phi."""
    mean_phi = float(np.mean(phi))
    mean_phi2 = float(np.mean(phi ** 2))
    min_phi = float(np.min(phi))
    max_phi = float(np.max(phi))
    fe = free_energy_1d(phi, dx)
    
    return {
        "mean_phi": mean_phi,
        "mean_phi2": mean_phi2,
        "min_phi": min_phi,
        "max_phi": max_phi,
        "free_energy": fe,
    }


def compute_diagnostics_2d(phi: np.ndarray, dx: float, dy: float = None) -> Dict[str, float]:
    """Calculate 2D spatial diagnostics for current field phi."""
    if dy is None:
        dy = dx
    mean_phi = float(np.mean(phi))
    mean_phi2 = float(np.mean(phi ** 2))
    min_phi = float(np.min(phi))
    max_phi = float(np.max(phi))
    fe = free_energy_2d(phi, dx, dy)
    
    return {
        "mean_phi": mean_phi,
        "mean_phi2": mean_phi2,
        "min_phi": min_phi,
        "max_phi": max_phi,
        "free_energy": fe,
    }

