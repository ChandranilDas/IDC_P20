"""
tdgl_2d.py
2D Time-Dependent Ginzburg-Landau (TDGL) simulation runner.
"""

from typing import Dict, List, Optional, Tuple, Union, Callable
import numpy as np
from src.tdgl_core import TDGL2DConfig, euler_step_2d
from src.diagnostics import compute_diagnostics_2d


def simulate_2d(
    config: TDGL2DConfig,
    phi_init: np.ndarray,
    save_times: Optional[List[float]] = None,
    save_interval: Optional[float] = None,
    diag_interval: Optional[float] = 1.0,
    callback: Optional[Callable[[float, np.ndarray], None]] = None
) -> Dict[str, Union[np.ndarray, List[float], Dict[str, np.ndarray]]]:
    """
    Run 2D TDGL Forward Euler simulation using 5-point Laplacian and periodic BCs.

    Args:
        config: TDGL2DConfig instance
        phi_init: Initial 2D array of shape (Nx, Ny)
        save_times: Specific times at which to snapshot the full 2D field phi
        save_interval: Periodic time interval for snapshot saving
        diag_interval: Time interval for recording scalar diagnostics
        callback: Optional callback(t, phi)

    Returns:
        Dictionary containing:
            'x': 1D grid in x
            'y': 1D grid in y
            't_snapshots': times of saved 2D field snapshots
            'snapshots': 3D array of shape (num_snapshots, Nx, Ny)
            'diag_times': times of diagnostics
            'mean_phi': <phi>(t)
            'mean_phi2': <phi^2>(t)
            'min_phi': min(phi)
            'max_phi': max(phi)
            'free_energy': F(t)
            'config': dictionary of configuration parameters
    """
    dx = config.dx
    dy = config.dy
    dt = config.dt
    t_final = config.t_final
    Nx, Ny = config.Nx, config.Ny

    phi = np.array(phi_init, dtype=np.float64, copy=True)
    t = 0.0

    # Snapshot scheduling
    if save_times is not None:
        target_save_times = sorted(list(save_times))
        save_idx = 0
    else:
        target_save_times = None
        next_save_t = 0.0

    # Diagnostic scheduling
    next_diag_t = 0.0

    snapshots_list: List[np.ndarray] = []
    t_snapshots: List[float] = []

    diag_times: List[float] = []
    mean_phi_list: List[float] = []
    mean_phi2_list: List[float] = []
    min_phi_list: List[float] = []
    max_phi_list: List[float] = []
    fe_list: List[float] = []

    # Initial snapshot check
    if target_save_times is not None:
        if save_idx < len(target_save_times) and abs(t - target_save_times[save_idx]) < 0.5 * dt:
            snapshots_list.append(phi.copy())
            t_snapshots.append(t)
            save_idx += 1
    elif save_interval is not None:
        snapshots_list.append(phi.copy())
        t_snapshots.append(t)
        next_save_t += save_interval

    # Initial diagnostics
    d0 = compute_diagnostics_2d(phi, dx, dy)
    diag_times.append(t)
    mean_phi_list.append(d0["mean_phi"])
    mean_phi2_list.append(d0["mean_phi2"])
    min_phi_list.append(d0["min_phi"])
    max_phi_list.append(d0["max_phi"])
    fe_list.append(d0["free_energy"])
    next_diag_t += diag_interval

    num_steps = int(np.round(t_final / dt))

    for step in range(1, num_steps + 1):
        phi = euler_step_2d(phi, dx, dt, dy)
        t = step * dt

        # Snapshot check
        if target_save_times is not None:
            if save_idx < len(target_save_times) and (t >= target_save_times[save_idx] - 0.5 * dt):
                snapshots_list.append(phi.copy())
                t_snapshots.append(t)
                save_idx += 1
        elif save_interval is not None and t >= next_save_t - 0.5 * dt:
            snapshots_list.append(phi.copy())
            t_snapshots.append(t)
            next_save_t += save_interval

        # Diagnostics check
        if diag_interval is not None and t >= next_diag_t - 0.5 * dt:
            d = compute_diagnostics_2d(phi, dx, dy)
            diag_times.append(t)
            mean_phi_list.append(d["mean_phi"])
            mean_phi2_list.append(d["mean_phi2"])
            min_phi_list.append(d["min_phi"])
            max_phi_list.append(d["max_phi"])
            fe_list.append(d["free_energy"])
            next_diag_t += diag_interval

        if callback is not None:
            callback(t, phi)

    return {
        "x": config.x,
        "y": config.y,
        "t_snapshots": np.array(t_snapshots),
        "snapshots": np.array(snapshots_list),
        "diag_times": np.array(diag_times),
        "mean_phi": np.array(mean_phi_list),
        "mean_phi2": np.array(mean_phi2_list),
        "min_phi": np.array(min_phi_list),
        "max_phi": np.array(max_phi_list),
        "free_energy": np.array(fe_list),
        "config": {
            "L": config.L,
            "Nx": config.Nx,
            "Ny": config.Ny,
            "dx": config.dx,
            "dy": config.dy,
            "dt": config.dt,
            "t_final": config.t_final,
            "dt_max": config.dt_max,
            "safety_ratio": config.safety_ratio
        }
    }

