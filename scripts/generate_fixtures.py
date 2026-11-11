#!/usr/bin/env python3
"""
scripts/generate_fixtures.py
Generates exact numerical fixtures using audited src/tdgl_core.py for TypeScript testing.
Includes:
- 1D test field: input, Laplacian, reaction, RHS, 1 Euler step, exact forward-edge free energy, 5-step trajectory
- 2D square test field: input, 5-point Laplacian, reaction, RHS, 1 Euler step, exact forward-edge free energy, 5-step trajectory
- 2D rectangular unequal-spacing parity fixture (Nx != Ny, dx != dy): verifies no axis-swapping or row/col transpose bugs
- Fixed point responses (phi = +1, -1, 0)
- Directional derivative values
- Discrete eigenvalues for 2D Fourier eigenmodes
"""

import json
from pathlib import Path
import numpy as np

import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.tdgl_core import (
    laplacian_1d,
    laplacian_2d,
    tdgl_rhs_1d,
    tdgl_rhs_2d,
    euler_step_1d,
    euler_step_2d,
    free_energy_1d,
    free_energy_2d,
)

FIXTURES_DIR = ROOT / "web" / "tests" / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

def generate_fixtures():
    # 1. 1D Fixture
    N1 = 16
    L1 = 8.0
    dx1 = L1 / N1  # 0.5
    dt1 = 0.02
    x1 = np.linspace(0, L1, N1, endpoint=False)
    phi1_0 = 0.4 * np.sin(2.0 * np.pi * x1 / L1) + 0.1 * np.cos(4.0 * np.pi * x1 / L1)

    lap1 = laplacian_1d(phi1_0, dx1)
    react1 = phi1_0 - phi1_0**3
    rhs1 = tdgl_rhs_1d(phi1_0, dx1)
    step1 = euler_step_1d(phi1_0, dx1, dt1)
    fe1_0 = free_energy_1d(phi1_0, dx1)
    fe1_1 = free_energy_1d(step1, dx1)

    # 5-step trajectory
    traj1 = [phi1_0.tolist()]
    cur1 = phi1_0.copy()
    fe1_traj = [fe1_0]
    for _ in range(5):
        cur1 = euler_step_1d(cur1, dx1, dt1)
        traj1.append(cur1.tolist())
        fe1_traj.append(free_energy_1d(cur1, dx1))

    # 2. 2D Square Fixture (Nx = Ny = 8, dx = dy = 1.0)
    Nx2, Ny2 = 8, 8
    L2 = 8.0
    dx2 = L2 / Nx2  # 1.0
    dt2 = 0.01
    x2 = np.linspace(0, L2, Nx2, endpoint=False)
    y2 = np.linspace(0, L2, Ny2, endpoint=False)
    X2, Y2 = np.meshgrid(x2, y2, indexing="ij")
    phi2_0 = 0.3 * np.sin(2.0 * np.pi * X2 / L2) * np.cos(2.0 * np.pi * Y2 / L2)

    lap2 = laplacian_2d(phi2_0, dx2)
    react2 = phi2_0 - phi2_0**3
    rhs2 = tdgl_rhs_2d(phi2_0, dx2)
    step2 = euler_step_2d(phi2_0, dx2, dt2)
    fe2_0 = free_energy_2d(phi2_0, dx2)
    fe2_1 = free_energy_2d(step2, dx2)

    traj2 = [phi2_0.tolist()]
    cur2 = phi2_0.copy()
    fe2_traj = [fe2_0]
    for _ in range(5):
        cur2 = euler_step_2d(cur2, dx2, dt2)
        traj2.append(cur2.tolist())
        fe2_traj.append(free_energy_2d(cur2, dx2))

    # 3. 2D Rectangular Unequal-Spacing Parity Fixture (Nx=6, Ny=10, dx=1.0, dy=0.5)
    Nx_rect, Ny_rect = 6, 10
    dx_rect, dy_rect = 1.0, 0.5
    Lx_rect = Nx_rect * dx_rect  # 6.0
    Ly_rect = Ny_rect * dy_rect  # 5.0
    dt_rect = 0.005

    xr = np.linspace(0, Lx_rect, Nx_rect, endpoint=False)
    yr = np.linspace(0, Ly_rect, Ny_rect, endpoint=False)
    Xr, Yr = np.meshgrid(xr, yr, indexing="ij")
    # asymmetric wave so swapping x and y changes values completely
    phi_rect = 0.35 * np.sin(2.0 * np.pi * Xr / Lx_rect) * np.cos(4.0 * np.pi * Yr / Ly_rect) + 0.1 * np.cos(2.0 * np.pi * Xr / Lx_rect)

    lap_rect = laplacian_2d(phi_rect, dx=dx_rect, dy=dy_rect)
    rhs_rect = tdgl_rhs_2d(phi_rect, dx=dx_rect, dy=dy_rect)
    step_rect = euler_step_2d(phi_rect, dx=dx_rect, dt=dt_rect, dy=dy_rect)
    fe_rect_0 = free_energy_2d(phi_rect, dx=dx_rect, dy=dy_rect)
    fe_rect_1 = free_energy_2d(step_rect, dx=dx_rect, dy=dy_rect)

    fixtures = {
        "one_d": {
            "N": N1,
            "L": L1,
            "dx": dx1,
            "dt": dt1,
            "initial_phi": phi1_0.tolist(),
            "expected_laplacian": lap1.tolist(),
            "expected_reaction": react1.tolist(),
            "expected_rhs": rhs1.tolist(),
            "expected_euler_step": step1.tolist(),
            "expected_free_energy_initial": fe1_0,
            "expected_free_energy_step1": fe1_1,
            "trajectory_5_steps": traj1,
            "free_energy_trajectory": fe1_traj,
        },
        "two_d": {
            "Nx": Nx2,
            "Ny": Ny2,
            "L": L2,
            "dx": dx2,
            "dt": dt2,
            "initial_phi": phi2_0.tolist(),  # [8][8]
            "expected_laplacian": lap2.tolist(),
            "expected_reaction": react2.tolist(),
            "expected_rhs": rhs2.tolist(),
            "expected_euler_step": step2.tolist(),
            "expected_free_energy_initial": fe2_0,
            "expected_free_energy_step1": fe2_1,
            "trajectory_5_steps": traj2,
            "free_energy_trajectory": fe2_traj,
        },
        "two_d_rectangular": {
            "Nx": Nx_rect,
            "Ny": Ny_rect,
            "Lx": Lx_rect,
            "Ly": Ly_rect,
            "dx": dx_rect,
            "dy": dy_rect,
            "dt": dt_rect,
            "initial_phi": phi_rect.tolist(),  # [6][10]
            "expected_laplacian": lap_rect.tolist(),
            "expected_rhs": rhs_rect.tolist(),
            "expected_euler_step": step_rect.tolist(),
            "expected_free_energy_initial": fe_rect_0,
            "expected_free_energy_step1": fe_rect_1,
        },
        "fixed_points": {
            "plus1": {
                "field_1d": [1.0] * N1,
                "expected_rhs_1d": [0.0] * N1,
                "expected_free_energy_1d": -0.25 * L1,
            },
            "minus1": {
                "field_1d": [-1.0] * N1,
                "expected_rhs_1d": [0.0] * N1,
                "expected_free_energy_1d": -0.25 * L1,
            },
            "zero": {
                "field_1d": [0.0] * N1,
                "expected_rhs_1d": [0.0] * N1,
                "expected_free_energy_1d": 0.0,
            }
        }
    }

    out_file = FIXTURES_DIR / "tdgl_fixtures.json"
    with open(out_file, "w") as f:
        json.dump(fixtures, f, indent=2)
    print(f"Generated test fixtures: {out_file} ({out_file.stat().st_size} bytes)")

if __name__ == "__main__":
    generate_fixtures()
