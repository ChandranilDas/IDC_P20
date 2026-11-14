"""
experiments/run_1d_random.py
Main 1D TDGL Experiment: Random zero-mean quench (Case A).

Simulates:
    d(phi)/dt = phi - phi^3 + d^2(phi)/dx^2
Parameters:
    L = 100, N = 1024, dx = 0.09765625, dt = 0.001, t_final = 1000.0
Produces:
    - results/raw/tdgl_1d_random.npz
    - results/raw/tdgl_1d_diagnostics.csv
    - results/figures/fig1_1d_initial_field.png
    - results/figures/fig2_1d_evolution_curves.png
    - results/figures/fig3_1d_spacetime_heatmap.png
    - results/figures/fig5_1d_final_profile.png
    - results/animations/tdgl_1d_evolution.gif
"""

import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.plot_style import FIELD, FIELD_CMAP, RMS, REFERENCE
from src.tdgl_core import TDGL1DConfig
from src.initial_conditions import make_random_ic_1d
from src.tdgl_1d import simulate_1d
from src.spectra import spectrum_1d, fit_porod_law
from src.plotting import (
    plot_1d_initial_field,
    plot_1d_multi_curves,
    plot_1d_spacetime_heatmap,
    plot_1d_final_profile
)


def run():
    print("=" * 60)
    print("Running 1D TDGL Experiment (Random Quench, Case A)")
    print("=" * 60)

    cfg = TDGL1DConfig(L=100.0, N=1024, dt=1.0e-3, t_final=1000.0)
    print(f"Parameters: L={cfg.L}, N={cfg.N}, dx={cfg.dx:.6f}, dt={cfg.dt}, t_final={cfg.t_final}")
    print(f"Stability dt_max={cfg.dt_max:.6f}, safety_ratio={cfg.safety_ratio:.4f}")

    seed = 42
    phi0 = make_random_ic_1d(N=cfg.N, phi0=0.0, noise_amplitude=0.05, seed=seed)

    # Save target times for high-value snapshots
    target_times = [0.0, 1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0]
    
    # Also save periodic snapshots every 2.0 time units for spacetime diagram and animation
    anim_interval = 2.0
    anim_times = np.arange(0.0, cfg.t_final + 0.5 * anim_interval, anim_interval)
    combined_save_times = sorted(list(set(target_times + list(anim_times))))

    print("Simulating 1D TDGL forward in time...")
    res = simulate_1d(
        config=cfg,
        phi_init=phi0,
        save_times=combined_save_times,
        diag_interval=0.5
    )

    t_snaps = res["t_snapshots"]
    snaps = res["snapshots"]
    x = res["x"]
    print(f"Simulation completed: {len(t_snaps)} snapshots saved, {len(res['diag_times'])} diagnostics recorded.")

    # Save raw results
    os.makedirs("results/raw", exist_ok=True)
    np.savez_compressed(
        "results/raw/tdgl_1d_random.npz",
        x=x,
        t_snapshots=t_snaps,
        snapshots=snaps,
        diag_times=res["diag_times"],
        mean_phi=res["mean_phi"],
        mean_phi2=res["mean_phi2"],
        min_phi=res["min_phi"],
        max_phi=res["max_phi"],
        free_energy=res["free_energy"],
        dt=cfg.dt,
        dx=cfg.dx,
        L=cfg.L,
        N=cfg.N,
        seed=seed,
        noise_amplitude=0.05,
        phi0=0.0
    )
    print("Saved raw simulation data to results/raw/tdgl_1d_random.npz")

    # Save small CSV diagnostics
    import csv
    with open("results/raw/tdgl_1d_diagnostics.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["time", "mean_phi", "mean_phi2", "min_phi", "max_phi", "free_energy"])
        for i in range(len(res["diag_times"])):
            writer.writerow([
                f"{res['diag_times'][i]:.2f}",
                f"{res['mean_phi'][i]:.6e}",
                f"{res['mean_phi2'][i]:.6e}",
                f"{res['min_phi'][i]:.6e}",
                f"{res['max_phi'][i]:.6e}",
                f"{res['free_energy'][i]:.6e}"
            ])
    print("Saved diagnostics table to results/raw/tdgl_1d_diagnostics.csv")

    # Generate Figures
    os.makedirs("results/figures", exist_ok=True)
    
    # Figure 1: Initial Field
    plot_1d_initial_field(
        x=x,
        phi_0=snaps[0],
        out_path="results/figures/fig1_1d_initial_field.png"
    )
    print("Generated results/figures/fig1_1d_initial_field.png")

    # Figure 2: Several curves on one graph
    plot_1d_multi_curves(
        x=x,
        snapshots=snaps,
        times=t_snaps,
        selected_times=[0.0, 2.0, 10.0, 50.0, 250.0, 1000.0],
        out_path="results/figures/fig2_1d_evolution_curves.png"
    )
    print("Generated results/figures/fig2_1d_evolution_curves.png")

    # Figure 3: Space-time heatmap
    plot_1d_spacetime_heatmap(
        x=x,
        times=t_snaps,
        field_history=snaps,
        out_path="results/figures/fig3_1d_spacetime_heatmap.png"
    )
    print("Generated results/figures/fig3_1d_spacetime_heatmap.png")

    # Figure 5: Final ordered profile
    plot_1d_final_profile(
        x=x,
        phi_final=snaps[-1],
        t_final=t_snaps[-1],
        out_path="results/figures/fig5_1d_final_profile.png"
    )
    print("Generated results/figures/fig5_1d_final_profile.png")

    # Generate 1D Animation
    os.makedirs("results/animations", exist_ok=True)
    print("Generating 1D animation GIF...")
    anim_subsample = max(1, len(snaps) // 100) # ~100 frames
    frames = []
    fig, ax = plt.subplots(figsize=(7, 3.5), dpi=150)
    
    for i in range(0, len(snaps), anim_subsample):
        ax.clear()
        t_curr = t_snaps[i]
        ax.plot(x, snaps[i], color=FIELD, lw=1.8)
        ax.axhline(+1.0, color="gray", ls="--", alpha=0.5)
        ax.axhline(-1.0, color="gray", ls="--", alpha=0.5)
        ax.axhline(0.0, color="k", ls=":", alpha=0.3)
        ax.set_xlim(0, cfg.L)
        ax.set_ylim(-1.3, 1.3)
        ax.set_xlabel("Spatial coordinate $x$")
        ax.set_ylabel(r"$\phi(x, t)$")
        ax.set_title(f"1D TDGL Evolution: $t = {t_curr:.1f}$")
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        
        fig.canvas.draw()
        rgba = np.array(fig.canvas.buffer_rgba(), copy=True)
        frames.append(Image.fromarray(rgba).copy())
        
    plt.close(fig)

    if frames:
        frames[0].save(
            "results/animations/tdgl_1d_evolution.gif",
            save_all=True,
            append_images=frames[1:],
            duration=50,
            loop=0
        )
        print("Generated results/animations/tdgl_1d_evolution.gif")

    # Compute 1D Fourier spectrum at final time
    k_1d, E_1d = spectrum_1d(snaps[-1], cfg.dx)
    fit_res = fit_porod_law(k_1d, E_1d, k_min=0.2, k_max=2.0)
    print(f"1D Spectrum at t=1000: Porod exponent = {fit_res['exponent']:.2f} (theoretical: -2.00)")

    return res


if __name__ == "__main__":
    run()

