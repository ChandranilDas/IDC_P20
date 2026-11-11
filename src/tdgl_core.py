r"""
tdgl_core.py
Core numerical routines and configurations for Time-Dependent Ginzburg-Landau (TDGL) simulations.

Model: Real scalar nonconserved TDGL (Model A):
    d(phi)/dt = phi - phi^3 + Lap(phi) = - delta F / delta phi
Free Energy Functional:
    F[phi] = \int [ - phi^2/2 + phi^4/4 + (1/2)|grad(phi)|^2 ] dr
"""

from dataclasses import dataclass
from typing import Tuple
import numpy as np


@dataclass
class TDGL1DConfig:
    """Configuration parameters for 1D TDGL simulations based on Yadav et al. (2024)."""
    L: float = 100.0          # System length
    N: int = 1024             # Number of grid points
    dt: float = 1.0e-3        # Time step size
    t_final: float = 1000.0   # Final simulation time
    
    @property
    def dx(self) -> float:
        return self.L / self.N
    
    @property
    def x(self) -> np.ndarray:
        # Periodic domain [0, L)
        return np.linspace(0.0, self.L, self.N, endpoint=False)

    @property
    def dt_max(self) -> float:
        """Stability bound: dt <= dx^2 / (dx^2 + 2*D) with D=1."""
        dx2 = self.dx ** 2
        return dx2 / (dx2 + 2.0 * 1.0)

    @property
    def safety_ratio(self) -> float:
        return self.dt / self.dt_max


@dataclass
class TDGL2DConfig:
    """Configuration parameters for 2D TDGL simulations based on Yadav et al. (2024)."""
    L: float = 128.0          # Linear dimension L
    Nx: int = 128             # Grid size in x
    Ny: int = 128             # Grid size in y
    dt: float = 1.0e-2        # Time step size
    t_final: float = 100.0    # Final simulation time
    
    @property
    def dx(self) -> float:
        return self.L / self.Nx

    @property
    def dy(self) -> float:
        return self.L / self.Ny
    
    @property
    def x(self) -> np.ndarray:
        return np.linspace(0.0, self.L, self.Nx, endpoint=False)
        
    @property
    def y(self) -> np.ndarray:
        return np.linspace(0.0, self.L, self.Ny, endpoint=False)

    @property
    def dt_max(self) -> float:
        """Stability bound: dt <= dx^2 / (dx^2 + 2*D) with D=2 (assuming dx=dy)."""
        dx2 = self.dx ** 2
        return dx2 / (dx2 + 2.0 * 2.0)

    @property
    def safety_ratio(self) -> float:
        return self.dt / self.dt_max


def stability_limit_dt(dx: float, dimension: int) -> float:
    """
    Theoretical maximum timestep for explicit Forward Euler TDGL scheme:
        dt <= dx^2 / (dx^2 + 2*D)
    as derived in Yadav, Verma, and Puri, Phys. Rev. E 110, 044130 (2024), Eq. (35).
    """
    dx2 = dx ** 2
    return dx2 / (dx2 + 2.0 * float(dimension))


def laplacian_1d(phi: np.ndarray, dx: float) -> np.ndarray:
    """
    Compute 1D Laplacian using central finite differences with periodic boundary conditions:
        (phi[i+1] - 2*phi[i] + phi[i-1]) / dx^2
    """
    return (np.roll(phi, -1) - 2.0 * phi + np.roll(phi, 1)) / (dx * dx)


def laplacian_2d(phi: np.ndarray, dx: float, dy: float = None) -> np.ndarray:
    """
    Compute 2D Laplacian using the standard 5-point discrete stencil with periodic BCs:
        (phi[i+1,j] + phi[i-1,j] - 2*phi[i,j]) / dx^2 + (phi[i,j+1] + phi[i,j-1] - 2*phi[i,j]) / dy^2
    For dx == dy, this reduces to:
        (phi[i+1,j] + phi[i-1,j] + phi[i,j+1] + phi[i,j-1] - 4*phi[i,j]) / dx^2
    """
    if dy is None or dy == dx:
        dx2 = dx * dx
        return (
            np.roll(phi, -1, axis=0) + np.roll(phi, 1, axis=0)
            + np.roll(phi, -1, axis=1) + np.roll(phi, 1, axis=1)
            - 4.0 * phi
        ) / dx2
    else:
        dx2 = dx * dx
        dy2 = dy * dy
        lap_x = (np.roll(phi, -1, axis=0) - 2.0 * phi + np.roll(phi, 1, axis=0)) / dx2
        lap_y = (np.roll(phi, -1, axis=1) - 2.0 * phi + np.roll(phi, 1, axis=1)) / dy2
        return lap_x + lap_y


def tdgl_rhs_1d(phi: np.ndarray, dx: float) -> np.ndarray:
    """
    RHS of 1D TDGL equation:
        d(phi)/dt = phi - phi^3 + d^2(phi)/dx^2
    """
    return phi - (phi ** 3) + laplacian_1d(phi, dx)


def tdgl_rhs_2d(phi: np.ndarray, dx: float, dy: float = None) -> np.ndarray:
    """
    RHS of 2D TDGL equation:
        d(phi)/dt = phi - phi^3 + Lap(phi)
    """
    return phi - (phi ** 3) + laplacian_2d(phi, dx, dy)


def euler_step_1d(phi: np.ndarray, dx: float, dt: float) -> np.ndarray:
    """Single forward Euler time-step update for 1D TDGL."""
    return phi + dt * tdgl_rhs_1d(phi, dx)


def euler_step_2d(phi: np.ndarray, dx: float, dt: float, dy: float = None) -> np.ndarray:
    """Single forward Euler time-step update for 2D TDGL."""
    return phi + dt * tdgl_rhs_2d(phi, dx, dy)


def free_energy_1d(phi: np.ndarray, dx: float) -> float:
    r"""
    Compute total Ginzburg-Landau free energy in 1D using forward edge differences:
        F = \sum_i [ -phi_i^2 / 2 + phi_i^4 / 4 + 0.5 * ((phi_{i+1} - phi_i) / dx)^2 ] * dx
    This exact discrete functional satisfies:
        dF / d(phi_i) = - dx * (phi_i - phi_i^3 + laplacian_1d(phi)_i) = - dx * RHS_i
    ensuring that the discrete dynamics is an exact gradient flow of F.
    """
    local_bulk = -0.5 * (phi ** 2) + 0.25 * (phi ** 4)
    # Forward edge differences (summed once per periodic edge)
    dphi_forward = (np.roll(phi, -1) - phi) / dx
    gradient_term = 0.5 * (dphi_forward ** 2)
    return float(np.sum(local_bulk + gradient_term) * dx)


def free_energy_2d(phi: np.ndarray, dx: float, dy: float = None) -> float:
    r"""
    Compute total Ginzburg-Landau free energy in 2D using forward edge differences:
        F = \sum_{i,j} [ -phi^2 / 2 + phi^4 / 4 + 0.5 * ((phi_{i+1,j}-phi_{i,j})/dx)^2
                        + 0.5 * ((phi_{i,j+1}-phi_{i,j})/dy)^2 ] * dx * dy
    This exact discrete functional satisfies:
        dF / d(phi_{i,j}) = - dx * dy * RHS_{i,j}
    matching the 5-point discrete Laplacian stencil.
    """
    if dy is None:
        dy = dx
    local_bulk = -0.5 * (phi ** 2) + 0.25 * (phi ** 4)
    # Forward edge differences in x and y (each edge counted once)
    dphi_dx_fwd = (np.roll(phi, -1, axis=0) - phi) / dx
    dphi_dy_fwd = (np.roll(phi, -1, axis=1) - phi) / dy
    gradient_term = 0.5 * (dphi_dx_fwd ** 2 + dphi_dy_fwd ** 2)
    return float(np.sum(local_bulk + gradient_term) * dx * dy)
