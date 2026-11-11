"""
initial_conditions.py
Initial condition generators for 1D and 2D TDGL simulations.

All fields are generated purely numerically based on the specifications
in Verma et al. (2023) and Yadav et al. (2024).
"""

from typing import Optional, Tuple
import numpy as np


def make_random_ic_1d(
    N: int,
    phi0: float = 0.0,
    noise_amplitude: float = 0.05,
    seed: Optional[int] = 42
) -> np.ndarray:
    """
    Generate 1D initial condition representing pre-quench disordered state:
        phi(x, 0) = phi0 + delta_phi(x, 0)
    where delta_phi is uniformly distributed in [-noise_amplitude, +noise_amplitude].
    Default phi0 = 0.0 corresponds to the symmetric / critical quench (Case A).
    """
    if seed is not None:
        rng = np.random.default_rng(seed)
    else:
        rng = np.random.default_rng()
    noise = rng.uniform(-noise_amplitude, noise_amplitude, size=N)
    return phi0 + noise


def make_random_ic_2d(
    Nx: int,
    Ny: int,
    phi0: float = 0.0,
    noise_amplitude: float = 0.05,
    seed: Optional[int] = 42
) -> np.ndarray:
    """
    Generate 2D initial condition representing pre-quench disordered state:
        phi(x, y, 0) = phi0 + delta_phi(x, y, 0)
    with delta_phi in [-noise_amplitude, +noise_amplitude].
    """
    if seed is not None:
        rng = np.random.default_rng(seed)
    else:
        rng = np.random.default_rng()
    noise = rng.uniform(-noise_amplitude, noise_amplitude, size=(Nx, Ny))
    return phi0 + noise


def make_kink_1d(
    x: np.ndarray,
    x0: float,
    sign: float = 1.0
) -> np.ndarray:
    """
    Exact analytical stationary 1D domain wall (kink) solution:
        phi(x) = sign * tanh( (x - x0) / sqrt(2) )
    Interface width xi = sqrt(2).
    """
    xi = np.sqrt(2.0)
    return sign * np.tanh((x - x0) / xi)


def make_kink_antikink_1d(
    x: np.ndarray,
    x1: float,
    x2: float,
    L: float
) -> np.ndarray:
    """
    Periodic 1D profile with a kink at x1 and an antikink at x2 (x1 < x2):
        phi(x) = tanh((x - x1)/sqrt(2)) - tanh((x - x2)/sqrt(2)) - 1.0
    For well-separated kinks within [0, L], this smoothly satisfies:
        phi -> -1 as x -> 0 and x -> L
        phi -> +1 between x1 and x2
    matching Verma et al. (2023) Section V A (e.g. x1 = 0.45*L, x2 = 0.55*L).
    """
    xi = np.sqrt(2.0)
    # Using periodic minimum-image displacement around centers if desired,
    # or direct sum of domain walls for interior domain:
    phi = np.tanh((x - x1) / xi) - np.tanh((x - x2) / xi) - 1.0
    return phi


def make_biased_ic_1d(
    N: int,
    phi0: float = 0.2,
    noise_amplitude: float = 0.05,
    seed: Optional[int] = 42
) -> np.ndarray:
    """
    Biased initial condition (Case D) with positive mean <phi> = 0.2,
    following Section V B of Verma et al. (2023).
    """
    return make_random_ic_1d(N, phi0=phi0, noise_amplitude=noise_amplitude, seed=seed)

