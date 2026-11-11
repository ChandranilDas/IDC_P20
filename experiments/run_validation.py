"""
experiments/run_validation.py
Comprehensive Scientific Validation Runner for TDGL 1D & 2D Solvers.

Executes and verifies:
    1. Fixed point invariance and linear instability
    2. Analytical kink interior spatial truncation residual & second-order convergence (p ~ 2)
    3. Monotonic free-energy dissipation (dF/dt <= 0) using exact discrete gradient energy
    4. Directional derivative consistency: grad F . v = - cell_volume * sum(RHS * v)
    5. Forward Euler temporal convergence rate via dt-halving: O(dt)
    6. 2D discrete Laplacian Fourier eigenmode verification
    7. Numerical stability criterion & deliberate unstable run
    8. Fourier modal spectra and Porod-law scaling (raw & hardened) with regression uncertainty
    9. System workflow diagram
Generates:
    - results/figures/fig7_free_energy_1d.png
    - results/figures/fig7_free_energy_2d.png
    - results/figures/fig8_convergence.png
    - results/figures/fig9_fourier_spectra.png
    - results/figures/fig10_workflow_diagram.png
    - results/validation/kink_convergence.csv
    - results/validation/validation_summary.json
"""

import os
import sys
import json
import csv
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.tdgl_core import (
    TDGL1DConfig, TDGL2DConfig,
    tdgl_rhs_1d, tdgl_rhs_2d,
    euler_step_1d, laplacian_2d,
    free_energy_1d, free_energy_2d
)
from src.validation import (
    validate_fixed_points,
    validate_kink_convergence,
    check_free_energy_monotonicity,
    check_stability_limits,
    run_unstable_demonstration_1d
)
from src.spectra import spectrum_1d, spectrum_2d, fit_porod_law
from src.plotting import (
    plot_convergence,
    plot_free_energy_curves,
    plot_spectra,
    plot_workflow_diagram
)


def run():
    print("=" * 60)
    print("Executing Complete TDGL Scientific Validation Suite")
    print("=" * 60)

    os.makedirs("results/validation", exist_ok=True)
    os.makedirs("results/figures", exist_ok=True)

    summary = {}

    # -------------------------------------------------------------
    # 1. Fixed Point Validation
    # -------------------------------------------------------------
    print("\n--- Validation 1: Fixed Point Analysis ---")
    fp_res = validate_fixed_points()
    summary["fixed_points"] = fp_res
    print(f"  phi = +1 residual: {fp_res['fixed_point_plus1']['max_residual']:.2e} (Stationary: {fp_res['fixed_point_plus1']['is_stationary']})")
    print(f"  phi = -1 residual: {fp_res['fixed_point_minus1']['max_residual']:.2e} (Stationary: {fp_res['fixed_point_minus1']['is_stationary']})")
    print(f"  phi = 0 + eps growth: {fp_res['unstable_point_zero']['growth_ratio']:.2f}x (Unstable: {fp_res['unstable_point_zero']['is_unstable']})")

    # -------------------------------------------------------------
    # 2. Analytical Kink Interior Residual & Second-Order Convergence
    # -------------------------------------------------------------
    print("\n--- Validation 2: Spatial Convergence Order (Interior Kink Truncation) ---")
    print("  Note: Single tanh is non-periodic on [0, L); evaluating interior truncation error.")
    conv_res = validate_kink_convergence(L=60.0, N_list=[128, 256, 512, 1024, 2048])
    summary["kink_convergence"] = {
        "evaluation_domain": "Interior region [0.2*L, 0.8*L] (eliminating boundary wrap artifact)",
        "N_list": conv_res["N_list"].tolist(),
        "dx": conv_res["dx"].tolist(),
        "l2_errors": conv_res["l2_errors"].tolist(),
        "linf_errors": conv_res["linf_errors"].tolist(),
        "p_l2": conv_res["p_l2"],
        "p_linf": conv_res["p_linf"]
    }
    print(f"  Fitted Convergence Order L2   : p = {conv_res['p_l2']:.4f}")
    print(f"  Fitted Convergence Order Linf : p = {conv_res['p_linf']:.4f}")

    # Save convergence CSV
    with open("results/validation/kink_convergence.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["N", "dx", "L2_Residual", "Linf_Residual"])
        for i in range(len(conv_res["N_list"])):
            writer.writerow([
                conv_res["N_list"][i],
                f"{conv_res['dx'][i]:.6f}",
                f"{conv_res['l2_errors'][i]:.6e}",
                f"{conv_res['linf_errors'][i]:.6e}"
            ])

    # Plot Figure 8
    plot_convergence(conv_res, "results/figures/fig8_convergence.png")
    print("  Generated results/figures/fig8_convergence.png")

    # -------------------------------------------------------------
    # 3. Exact Directional Derivative Consistency
    # -------------------------------------------------------------
    print("\n--- Validation 3: Discrete Free Energy Gradient Flow Consistency ---")
    rng = np.random.default_rng(777)
    # 1D test
    phi_1d_test = rng.standard_normal(128)
    v_1d_test = rng.standard_normal(128)
    dx_test = 0.5
    eps = 1e-7
    f1_p = free_energy_1d(phi_1d_test + eps * v_1d_test, dx_test)
    f1_m = free_energy_1d(phi_1d_test - eps * v_1d_test, dx_test)
    num_d1 = (f1_p - f1_m) / (2.0 * eps)
    ana_d1 = - dx_test * float(np.sum(tdgl_rhs_1d(phi_1d_test, dx_test) * v_1d_test))
    rel_err_1d = abs(num_d1 - ana_d1) / abs(ana_d1)

    # 2D test
    phi_2d_test = rng.standard_normal((32, 32))
    v_2d_test = rng.standard_normal((32, 32))
    f2_p = free_energy_2d(phi_2d_test + eps * v_2d_test, dx_test)
    f2_m = free_energy_2d(phi_2d_test - eps * v_2d_test, dx_test)
    num_d2 = (f2_p - f2_m) / (2.0 * eps)
    ana_d2 = - (dx_test ** 2) * float(np.sum(tdgl_rhs_2d(phi_2d_test, dx_test) * v_2d_test))
    rel_err_2d = abs(num_d2 - ana_d2) / abs(ana_d2)

    summary["directional_derivative"] = {
        "1D_relative_mismatch": rel_err_1d,
        "1D_passed": bool(rel_err_1d < 1e-6),
        "2D_relative_mismatch": rel_err_2d,
        "2D_passed": bool(rel_err_2d < 1e-6)
    }
    print(f"  1D grad F . v = - dx * sum(RHS * v) mismatch: {rel_err_1d:.2e} (Passed: {rel_err_1d < 1e-6})")
    print(f"  2D grad F . v = - dV * sum(RHS * v) mismatch: {rel_err_2d:.2e} (Passed: {rel_err_2d < 1e-6})")

    # -------------------------------------------------------------
    # 4. Temporal Convergence Rate (dt-Halving)
    # -------------------------------------------------------------
    print("\n--- Validation 4: Temporal Convergence (Forward Euler O(dt)) ---")
    c_temp = TDGL1DConfig(L=20.0, N=128)
    x_t = c_temp.x
    phi_init_t = 0.5 * np.sin(2.0 * np.pi * x_t / c_temp.L)
    t_target = 0.1

    def run_dt(dt_step):
        steps = int(round(t_target / dt_step))
        p = phi_init_t.copy()
        for _ in range(steps):
            p = euler_step_1d(p, c_temp.dx, dt_step)
        return p

    p_ref = run_dt(0.0001)
    p_dt1 = run_dt(0.002)
    p_dt2 = run_dt(0.001)

    err1 = float(np.max(np.abs(p_dt1 - p_ref)))
    err2 = float(np.max(np.abs(p_dt2 - p_ref)))
    temporal_order = float(np.log2(err1 / err2))
    summary["temporal_convergence"] = {
        "dt1": 0.002, "err1": err1,
        "dt2": 0.001, "err2": err2,
        "measured_order": temporal_order,
        "expected_order": 1.0
    }
    print(f"  Error at dt=0.002: {err1:.4e}, at dt=0.001: {err2:.4e} -> Temporal order: {temporal_order:.2f} (Theoretical: 1.00)")

    # -------------------------------------------------------------
    # 5. 2D Periodic Fourier Eigenmode Verification
    # -------------------------------------------------------------
    print("\n--- Validation 5: 2D Discrete Laplacian Eigenmode Check ---")
    Nx, Ny = 64, 64
    L_e = 12.0
    dx_e = L_e / Nx
    x_e = np.linspace(0, L_e, Nx, endpoint=False)
    y_e = np.linspace(0, L_e, Ny, endpoint=False)
    Xe, Ye = np.meshgrid(x_e, y_e, indexing='ij')
    m, n = 3, 4
    kx_e = 2.0 * np.pi * m / L_e
    ky_e = 2.0 * np.pi * n / L_e
    phi_mode = np.cos(kx_e * Xe + ky_e * Ye)
    num_lap2d = laplacian_2d(phi_mode, dx_e, dx_e)
    exact_eigenval = - (4.0 / (dx_e ** 2)) * (np.sin(kx_e * dx_e / 2.0)**2 + np.sin(ky_e * dx_e / 2.0)**2)
    diff_eigen = float(np.max(np.abs(num_lap2d - exact_eigenval * phi_mode)))
    summary["fourier_eigenmode_2d"] = {
        "max_eigenvalue_residual": diff_eigen,
        "exact_eigenvalue": exact_eigenval,
        "continuum_eigenvalue": -(kx_e**2 + ky_e**2),
        "passed": bool(diff_eigen < 1e-11)
    }
    print(f"  2D Laplacian Fourier mode residual: {diff_eigen:.2e} (Passed: {diff_eigen < 1e-11})")

    # -------------------------------------------------------------
    # 6. Monotonic Free Energy Dissipation (Main Runs)
    # -------------------------------------------------------------
    print("\n--- Validation 6: Monotonic Free-Energy Dissipation (Main Runs) ---")
    d1 = np.load("results/raw/tdgl_1d_random.npz")
    d2 = np.load("results/raw/tdgl_2d_random.npz")

    fe_1d_check = check_free_energy_monotonicity(d1["free_energy"])
    fe_2d_check = check_free_energy_monotonicity(d2["free_energy"])
    summary["free_energy_1d"] = fe_1d_check
    summary["free_energy_2d"] = fe_2d_check

    print(f"  1D TDGL: Monotonic = {fe_1d_check['monotonic']} (Total Free Energy drop: {fe_1d_check['total_drop']:.4f})")
    print(f"  2D TDGL: Monotonic = {fe_2d_check['monotonic']} (Total Free Energy drop: {fe_2d_check['total_drop']:.4f})")

    plot_free_energy_curves(
        diag_1d={"diag_times": d1["diag_times"], "free_energy": d1["free_energy"]},
        diag_2d={"diag_times": d2["diag_times"], "free_energy": d2["free_energy"]},
        out_path_1d="results/figures/fig7_free_energy_1d.png",
        out_path_2d="results/figures/fig7_free_energy_2d.png"
    )
    print("  Generated results/figures/fig7_free_energy_1d.png & fig7_free_energy_2d.png")

    # -------------------------------------------------------------
    # 7. Numerical Stability Verification
    # -------------------------------------------------------------
    print("\n--- Validation 7: Numerical Stability Criteria ---")
    stab_res = check_stability_limits()
    unstable_demo = run_unstable_demonstration_1d(over_ratio=1.5, num_steps=200)
    summary["stability"] = {
        "linear_stability_criteria": stab_res,
        "unstable_demonstration": unstable_demo
    }
    print(f"  1D Linear Stability dt_max: {stab_res['1D']['dt_max']:.6f}, used: {stab_res['1D']['dt_used']}, safety: {stab_res['1D']['safety_ratio']:.4f}")
    print(f"  2D Linear Stability dt_max: {stab_res['2D']['dt_max']:.6f}, used: {stab_res['2D']['dt_used']}, safety: {stab_res['2D']['safety_ratio']:.4f}")
    print(f"  Unstable Test (dt = 1.5 * dt_max): Exploded = {unstable_demo['exploded']} at step {unstable_demo['step_exploded']}")

    # -------------------------------------------------------------
    # 8. Fourier Spectra & Porod Scaling (Raw & Hardened)
    # -------------------------------------------------------------
    print("\n--- Validation 8: Fourier Spectra & Porod Scaling ---")
    phi_1d_final = d1["snapshots"][-1]
    dx_1d = float(d1["dx"])
    
    # 1D spectra (rfft)
    k_1d, E_1d_raw = spectrum_1d(phi_1d_final, dx_1d)
    phi_1d_hardened = np.where(phi_1d_final >= 0.0, 1.0, -1.0)
    _, E_1d_hardened = spectrum_1d(phi_1d_hardened, dx_1d)
    
    # 2D spectra
    phi_2d_final = d2["snapshots"][-1]
    dx_2d = float(d2["dx"])
    k_2d, E_2d_raw_modal, E_2d_raw_shell = spectrum_2d(phi_2d_final, dx_2d)
    phi_2d_hardened = np.where(phi_2d_final >= 0.0, 1.0, -1.0)
    _, E_2d_hard_modal, E_2d_hard_shell = spectrum_2d(phi_2d_hardened, dx_2d)

    # Fits
    fit_1d_hard = fit_porod_law(k_1d, E_1d_hardened, k_min=0.1, k_max=1.8)
    fit_2d_hard = fit_porod_law(k_2d, E_2d_hard_modal, k_min=0.15, k_max=1.5)
    
    summary["spectra"] = {
        "description": "Porod fits computed on hardened step fields; fit stderr reflects regression-only uncertainty assuming uncorrelated residuals.",
        "1D_fit": fit_1d_hard,
        "1D_theoretical_porod": -2.0,
        "2D_fit": fit_2d_hard,
        "2D_theoretical_porod": -3.0
    }
    print(f"  1D Hardened Porod Exponent : {fit_1d_hard['exponent']:.2f} +/- {fit_1d_hard['stderr']:.2f} (Theoretical: -2.00, interval [{fit_1d_hard['k_min']}, {fit_1d_hard['k_max']}])")
    print(f"  2D Hardened Porod Exponent : {fit_2d_hard['exponent']:.2f} +/- {fit_2d_hard['stderr']:.2f} (Theoretical: -3.00, interval [{fit_2d_hard['k_min']}, {fit_2d_hard['k_max']}])")

    # Plot Figure 9
    plot_spectra(
        k_1d=k_1d,
        E_1d=E_1d_hardened,
        k_2d=k_2d,
        E_2d_modal=E_2d_hard_modal,
        fit_1d=fit_1d_hard,
        fit_2d=fit_2d_hard,
        out_path="results/figures/fig9_fourier_spectra.png"
    )
    print("  Generated results/figures/fig9_fourier_spectra.png")

    # -------------------------------------------------------------
    # 9. Workflow Diagram
    # -------------------------------------------------------------
    plot_workflow_diagram("results/figures/fig10_workflow_diagram.png")
    print("  Generated results/figures/fig10_workflow_diagram.png")

    # Save summary JSON
    with open("results/validation/validation_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("\nSaved complete validation report to results/validation/validation_summary.json")

    return summary


if __name__ == "__main__":
    run()
