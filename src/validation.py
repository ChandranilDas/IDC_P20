"""
validation.py
Rigorous scientific validation routines for the TDGL solvers.

Validations:
    1. Uniform Fixed Points:
       - Stability of phi = +1 and phi = -1
       - Instability of phi = 0
    2. Analytical Kink Residual & Second-Order Convergence:
       - Residual R(x) = phi - phi^3 + phi_xx for phi(x) = tanh((x-x0)/sqrt(2))
       - Log-log regression ||R||_2 vs dx showing p ~ 2
    3. Monotonic Free Energy Dissipation:
       - Verification that dF/dt <= 0 for relaxational gradient flow
    4. Numerical Stability Verification:
       - Comparison of operational dt against dt_max = dx^2 / (dx^2 + 2D)
       - Demonstration of numerical blow-up when dt > dt_max
"""

from typing import Dict, List, Tuple, Optional
import numpy as np
from src.tdgl_core import (
    TDGL1DConfig, TDGL2DConfig,
    tdgl_rhs_1d, euler_step_1d,
    laplacian_1d, free_energy_1d, free_energy_2d,
    stability_limit_dt
)
from src.initial_conditions import make_kink_1d


def validate_fixed_points() -> Dict[str, Dict[str, float]]:
    """
    Validate that phi = +1 and phi = -1 are invariant fixed points,
    and phi = 0 is linearly unstable.
    """
    N = 256
    dx = 0.1
    dt = 0.001
    
    # 1. State phi = +1
    phi_plus = np.ones(N)
    rhs_plus = tdgl_rhs_1d(phi_plus, dx)
    max_rhs_plus = float(np.max(np.abs(rhs_plus)))
    step_plus = euler_step_1d(phi_plus, dx, dt)
    change_plus = float(np.max(np.abs(step_plus - phi_plus)))
    
    # 2. State phi = -1
    phi_minus = -np.ones(N)
    rhs_minus = tdgl_rhs_1d(phi_minus, dx)
    max_rhs_minus = float(np.max(np.abs(rhs_minus)))
    step_minus = euler_step_1d(phi_minus, dx, dt)
    change_minus = float(np.max(np.abs(step_minus - phi_minus)))
    
    # 3. Unstable state phi = 0 + epsilon
    eps = 0.01
    phi_zero = eps * np.ones(N)
    # Evolve 500 steps (t = 0.5)
    p = phi_zero.copy()
    for _ in range(500):
        p = euler_step_1d(p, dx, dt)
    # In linear regime, d(phi)/dt ~ phi => phi(t) = eps * exp(t)
    expected_linear = eps * np.exp(0.5)
    actual_linear = float(np.mean(p))
    growth_ratio = actual_linear / eps

    return {
        "fixed_point_plus1": {
            "max_residual": max_rhs_plus,
            "max_step_change": change_plus,
            "is_stationary": bool(max_rhs_plus < 1e-12)
        },
        "fixed_point_minus1": {
            "max_residual": max_rhs_minus,
            "max_step_change": change_minus,
            "is_stationary": bool(max_rhs_minus < 1e-12)
        },
        "unstable_point_zero": {
            "epsilon_initial": eps,
            "mean_after_t0.5": actual_linear,
            "expected_linear": expected_linear,
            "growth_ratio": growth_ratio,
            "is_unstable": bool(growth_ratio > 1.5)
        }
    }


def validate_kink_convergence(
    L: float = 60.0,
    N_list: Optional[List[int]] = None
) -> Dict[str, np.ndarray]:
    """
    Test spatial order of accuracy against the exact analytical kink solution:
        phi_kink(x) = tanh((x - L/2) / sqrt(2))
    The continuous residual R = phi - phi^3 + phi_xx is identically 0.
    The finite-difference stencil produces a truncation error O(dx^2).
    
    Returns:
        Dictionary with dx_values, L2_errors, Linf_errors, convergence_order_p
    """
    if N_list is None:
        N_list = [128, 256, 512, 1024, 2048]
        
    dx_values = []
    l2_errors = []
    linf_errors = []
    
    x0 = L / 2.0
    
    for N in N_list:
        dx = L / N
        x = np.linspace(0.0, L, N, endpoint=False)
        phi = make_kink_1d(x, x0, sign=1.0)
        
        # Numerical residual R(x) = phi - phi^3 + laplacian_1d(phi, dx)
        # Avoid boundary wrapping artifact by evaluating in the interior region
        # [x0 - L/4, x0 + L/4] where tanh has essentially converged to +/- 1 near edges
        residual = tdgl_rhs_1d(phi, dx)
        
        # Interior mask (away from periodic boundary where tanh wrap occurs)
        interior = (x >= L * 0.2) & (x <= L * 0.8)
        res_int = residual[interior]
        
        l2_err = np.sqrt(np.mean(res_int ** 2))
        linf_err = np.max(np.abs(res_int))
        
        dx_values.append(dx)
        l2_errors.append(l2_err)
        linf_errors.append(linf_err)
        
    dx_arr = np.array(dx_values)
    l2_arr = np.array(l2_errors)
    linf_arr = np.array(linf_errors)
    
    # Fit order of convergence: log(Error) = p * log(dx) + const
    poly_l2 = np.polyfit(np.log10(dx_arr), np.log10(l2_arr), 1)
    p_l2 = float(poly_l2[0])
    
    poly_linf = np.polyfit(np.log10(dx_arr), np.log10(linf_arr), 1)
    p_linf = float(poly_linf[0])
    
    return {
        "N_list": np.array(N_list),
        "dx": dx_arr,
        "l2_errors": l2_arr,
        "linf_errors": linf_arr,
        "p_l2": p_l2,
        "p_linf": p_linf
    }


def check_free_energy_monotonicity(fe_series: np.ndarray, tolerance: float = 1e-7) -> Dict[str, float]:
    """
    Verify that free energy does not increase during simulation:
        F[n+1] - F[n] <= tolerance
    """
    diffs = np.diff(fe_series)
    max_increase = float(np.max(diffs)) if len(diffs) > 0 else 0.0
    num_violations = int(np.sum(diffs > tolerance))
    monotonic = bool(num_violations == 0)
    total_drop = float(fe_series[0] - fe_series[-1]) if len(fe_series) > 1 else 0.0
    
    return {
        "monotonic": monotonic,
        "max_increase": max_increase,
        "num_violations": num_violations,
        "total_drop": total_drop
    }


def check_stability_limits() -> Dict[str, Dict[str, float]]:
    """
    Calculate theoretical stability criteria for 1D and 2D reference configurations
    from Yadav et al. (2024), Eq. (35):
        dt <= dx^2 / (dx^2 + 2*D)
    """
    c1 = TDGL1DConfig()
    c2 = TDGL2DConfig()
    
    dt_max_1d = stability_limit_dt(c1.dx, 1)
    dt_max_2d = stability_limit_dt(c2.dx, 2)
    
    return {
        "1D": {
            "L": c1.L,
            "N": c1.N,
            "dx": c1.dx,
            "dt_used": c1.dt,
            "dt_max": dt_max_1d,
            "safety_ratio": c1.dt / dt_max_1d,
            "is_stable": bool(c1.dt <= dt_max_1d)
        },
        "2D": {
            "L": c2.L,
            "Nx": c2.Nx,
            "Ny": c2.Ny,
            "dx": c2.dx,
            "dt_used": c2.dt,
            "dt_max": dt_max_2d,
            "safety_ratio": c2.dt / dt_max_2d,
            "is_stable": bool(c2.dt <= dt_max_2d)
        }
    }


def run_unstable_demonstration_1d(
    over_ratio: float = 1.5,
    num_steps: int = 100
) -> Dict[str, float]:
    """
    Demonstrate numerical blowup when dt exceeds the stability bound:
        dt = over_ratio * dt_max
    """
    cfg = TDGL1DConfig()
    dt_unstable = over_ratio * cfg.dt_max
    rng = np.random.default_rng(123)
    phi = rng.uniform(-0.05, 0.05, size=cfg.N)
    
    exploded = False
    step_exploded = -1
    
    for s in range(1, num_steps + 1):
        phi = euler_step_1d(phi, cfg.dx, dt_unstable)
        if np.any(np.isnan(phi)) or np.any(np.isinf(phi)) or np.max(np.abs(phi)) > 1e6:
            exploded = True
            step_exploded = s
            break
            
    return {
        "dt_unstable": float(dt_unstable),
        "dt_max": float(cfg.dt_max),
        "over_ratio": float(over_ratio),
        "exploded": exploded,
        "step_exploded": step_exploded
    }
