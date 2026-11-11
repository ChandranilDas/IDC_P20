"""
test_tdgl.py
Comprehensive unit and numerical test suite for TDGL core, solvers, diagnostics, and validation.
"""

import pytest
import numpy as np
from src.tdgl_core import (
    TDGL1DConfig, TDGL2DConfig,
    laplacian_1d, laplacian_2d,
    tdgl_rhs_1d, tdgl_rhs_2d,
    euler_step_1d, euler_step_2d,
    free_energy_1d, free_energy_2d,
    stability_limit_dt
)
from src.initial_conditions import (
    make_random_ic_1d, make_random_ic_2d,
    make_kink_1d, make_kink_antikink_1d,
    make_biased_ic_1d
)
from src.diagnostics import compute_diagnostics_1d, compute_diagnostics_2d
from src.spectra import spectrum_1d, spectrum_2d
from src.validation import (
    validate_fixed_points,
    validate_kink_convergence,
    check_free_energy_monotonicity,
    check_stability_limits,
    run_unstable_demonstration_1d
)


def test_laplacian_constant_field():
    """Laplacian of a constant field must be strictly zero."""
    dx = 0.2
    c_1d = 3.5 * np.ones(100)
    lap_1d = laplacian_1d(c_1d, dx)
    assert np.allclose(lap_1d, 0.0, atol=1e-12)

    c_2d = -1.2 * np.ones((50, 50))
    lap_2d = laplacian_2d(c_2d, dx)
    assert np.allclose(lap_2d, 0.0, atol=1e-12)


def test_laplacian_sine_wave_accuracy():
    """Central difference Laplacian of sin(2*pi*x/L) must converge to -(2*pi/L)^2 sin(2*pi*x/L)."""
    L = 10.0
    k = 2.0 * np.pi / L
    for N in [64, 128, 256]:
        dx = L / N
        x = np.linspace(0.0, L, N, endpoint=False)
        phi = np.sin(k * x)
        lap = laplacian_1d(phi, dx)
        exact = -(k ** 2) * np.sin(k * x)
        err = np.max(np.abs(lap - exact))
        assert err < (k ** 4 / 12.0) * (dx ** 2) * 1.5


def test_2d_periodic_fourier_eigenmode():
    """
    Verify discrete 5-point Laplacian on 2D Fourier mode exp(i (kx*x + ky*y))
    matches exact discrete eigenvalue:
        lambda = - (4/dx^2) sin^2(kx*dx/2) - (4/dy^2) sin^2(ky*dy/2)
    to machine precision.
    """
    Nx, Ny = 64, 64
    L = 12.0
    dx = L / Nx
    dy = L / Ny
    x = np.linspace(0, L, Nx, endpoint=False)
    y = np.linspace(0, L, Ny, endpoint=False)
    X, Y = np.meshgrid(x, y, indexing='ij')

    m, n = 3, 4
    kx = 2.0 * np.pi * m / L
    ky = 2.0 * np.pi * n / L
    phi = np.cos(kx * X + ky * Y)
    
    num_lap = laplacian_2d(phi, dx, dy)
    lambda_disc = - (4.0 / dx**2) * np.sin(kx * dx / 2.0)**2 - (4.0 / dy**2) * np.sin(ky * dy / 2.0)**2
    exact_disc_lap = lambda_disc * phi
    
    assert np.allclose(num_lap, exact_disc_lap, atol=1e-11)


def test_directional_derivative_1d():
    """
    Verify that discrete free energy F is an exact potential for TDGL RHS:
        grad F . v = - dx * sum(RHS * v)
    evaluated via numerical two-sided difference quotient.
    """
    N = 128
    dx = 0.5
    rng = np.random.default_rng(101)
    phi = rng.standard_normal(N)
    v = rng.standard_normal(N)
    
    rhs = tdgl_rhs_1d(phi, dx)
    eps = 1e-7
    f_plus = free_energy_1d(phi + eps * v, dx)
    f_minus = free_energy_1d(phi - eps * v, dx)
    num_grad_dot_v = (f_plus - f_minus) / (2.0 * eps)
    ana_grad_dot_v = - dx * np.sum(rhs * v)
    
    rel_err = abs(num_grad_dot_v - ana_grad_dot_v) / abs(ana_grad_dot_v)
    assert rel_err < 1e-6, f"1D directional derivative mismatch: {rel_err}"


def test_directional_derivative_2d():
    """
    Verify that 2D discrete free energy F is an exact potential for 2D TDGL RHS:
        grad F . v = - (dx * dy) * sum(RHS * v)
    """
    Nx, Ny = 32, 32
    dx, dy = 0.8, 0.8
    rng = np.random.default_rng(202)
    phi = rng.standard_normal((Nx, Ny))
    v = rng.standard_normal((Nx, Ny))
    
    rhs = tdgl_rhs_2d(phi, dx, dy)
    eps = 1e-7
    f_plus = free_energy_2d(phi + eps * v, dx, dy)
    f_minus = free_energy_2d(phi - eps * v, dx, dy)
    num_grad_dot_v = (f_plus - f_minus) / (2.0 * eps)
    ana_grad_dot_v = - (dx * dy) * np.sum(rhs * v)
    
    rel_err = abs(num_grad_dot_v - ana_grad_dot_v) / abs(ana_grad_dot_v)
    assert rel_err < 1e-6, f"2D directional derivative mismatch: {rel_err}"


def test_fixed_points_invariance():
    """Equilibrium fixed points phi = +/- 1 must be stationary (RHS = 0)."""
    res = validate_fixed_points()
    assert res["fixed_point_plus1"]["is_stationary"]
    assert res["fixed_point_minus1"]["is_stationary"]
    assert res["fixed_point_plus1"]["max_residual"] < 1e-12
    assert res["fixed_point_minus1"]["max_residual"] < 1e-12
    assert res["unstable_point_zero"]["is_unstable"]


def test_interior_spatial_truncation_analytical_kink():
    """
    Residual of analytical kink in the interior domain (away from non-periodic boundaries)
    must exhibit quadratic spatial convergence p ~ 2.
    Note: Single tanh is not periodic; this evaluates interior truncation error only.
    """
    conv = validate_kink_convergence(L=60.0, N_list=[128, 256, 512, 1024])
    p_l2 = conv["p_l2"]
    p_linf = conv["p_linf"]
    assert 1.90 <= p_l2 <= 2.10, f"Expected p_l2 ~ 2.0, got {p_l2}"
    assert 1.90 <= p_linf <= 2.10, f"Expected p_linf ~ 2.0, got {p_linf}"


def test_temporal_convergence_dt_halving():
    """
    Verify first-order temporal convergence O(dt) of explicit Forward Euler scheme:
        || phi(dt) - phi_ref || / || phi(dt/2) - phi_ref || ~ 2.0
    """
    c = TDGL1DConfig(L=20.0, N=128)
    x = c.x
    phi0 = 0.5 * np.sin(2.0 * np.pi * x / c.L)
    t_target = 0.1

    def advance(dt_step):
        steps = int(round(t_target / dt_step))
        p = phi0.copy()
        for _ in range(steps):
            p = euler_step_1d(p, c.dx, dt_step)
        return p

    p_ref = advance(0.0001)
    p_dt1 = advance(0.002)
    p_dt2 = advance(0.001)

    err1 = np.max(np.abs(p_dt1 - p_ref))
    err2 = np.max(np.abs(p_dt2 - p_ref))
    ratio = err1 / err2
    assert 1.8 <= ratio <= 2.2, f"Expected dt-halving error ratio ~ 2.0, got {ratio}"


def test_free_energy_step_by_step_decay():
    """Verify that every single time step strictly decreases free energy F."""
    c = TDGL1DConfig(L=40.0, N=256, dt=0.001)
    rng = np.random.default_rng(303)
    phi = rng.uniform(-0.1, 0.1, size=c.N)
    
    prev_f = free_energy_1d(phi, c.dx)
    for _ in range(50):
        phi = euler_step_1d(phi, c.dx, c.dt)
        curr_f = free_energy_1d(phi, c.dx)
        assert curr_f <= prev_f + 1e-12, f"Free energy increased from {prev_f} to {curr_f}"
        prev_f = curr_f


def test_stability_bounds():
    """Check calculated linear stability limits match analytical formulas."""
    limits = check_stability_limits()
    assert limits["1D"]["is_stable"]
    assert limits["2D"]["is_stable"]
    assert limits["1D"]["safety_ratio"] < 0.25
    assert limits["2D"]["safety_ratio"] < 0.10

    # Test deliberate unstable run
    unst = run_unstable_demonstration_1d(over_ratio=1.5, num_steps=200)
    assert unst["exploded"]


def test_reproducibility():
    """Initial conditions generated with the same seed must be bitwise identical."""
    ic1 = make_random_ic_1d(N=512, seed=12345)
    ic2 = make_random_ic_1d(N=512, seed=12345)
    assert np.array_equal(ic1, ic2)

    ic3 = make_random_ic_2d(Nx=64, Ny=64, seed=54321)
    ic4 = make_random_ic_2d(Nx=64, Ny=64, seed=54321)
    assert np.array_equal(ic3, ic4)


def test_spectral_1d_parseval_theorem():
    """Sum of 1D modal energies sum_k E(k) must equal 0.5 * <phi^2> for both even and odd N."""
    for N in [256, 257]:
        dx = 0.5
        rng = np.random.default_rng(999 + N)
        phi = rng.standard_normal(N)
        k_vals, E_folded = spectrum_1d(phi, dx)
        total_spectral = float(np.sum(E_folded))
        expected = float(0.5 * np.mean(phi ** 2))
        assert np.isclose(total_spectral, expected, rtol=1e-12)


def test_spectral_2d_parseval_theorem():
    """Sum of 2D shell energies sum_{bins} E_shell(k) must equal 0.5 * <phi^2> exactly."""
    Nx, Ny = 64, 64
    dx, dy = 1.0, 1.0
    rng = np.random.default_rng(888)
    phi = rng.standard_normal((Nx, Ny))
    k_centers, E_modal, E_shell = spectrum_2d(phi, dx, dy)
    total_shell = float(np.sum(E_shell))
    expected = float(0.5 * np.mean(phi ** 2))
    assert np.isclose(total_shell, expected, rtol=1e-12)
