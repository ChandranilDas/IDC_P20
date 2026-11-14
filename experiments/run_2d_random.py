"""
experiments/run_2d_random.py
Main 2D TDGL Experiment: Domain Coarsening from Random Disordered State.

Simulates:
    d(phi)/dt = phi - phi^3 + Lap(phi)
Parameters from Yadav et al. (2024), Table I:
    L = 128, Nx = Ny = 128, dx = dy = 1.0, dt = 0.01, t_final = 100.0
Produces:
    - results/raw/tdgl_2d_random.npz
    - results/raw/tdgl_2d_diagnostics.csv
    - results/figures/fig6_2d_coarsening_panels.png
    - results/animations/tdgl_2d_coarsening.gif
"""

import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.plot_style import FIELD, FIELD_CMAP, RMS, REFERENCE
from src.tdgl_core import TDGL2DConfig
from src.initial_conditions import make_random_ic_2d
from src.tdgl_2d import simulate_2d
from src.spectra import spectrum_2d, fit_porod_law
from src.plotting import plot_2d_coarsening_panels


def run():
    print("=" * 60)
    print("Running 2D TDGL Experiment (Random Quench, Case A)")
    print("=" * 60)

    cfg = TDGL2DConfig(L=128.0, Nx=128, Ny=128, dt=1.0e-2, t_final=100.0)
    print(f"Parameters: L={cfg.L}, Nx={cfg.Nx}, Ny={cfg.Ny}, dx={cfg.dx}, dt={cfg.dt}, t_final={cfg.t_final}")
    print(f"Stability dt_max={cfg.dt_max:.4f}, safety_ratio={cfg.safety_ratio:.4f}")

    seed = 42
    phi0 = make_random_ic_2d(Nx=cfg.Nx, Ny=cfg.Ny, phi0=0.0, noise_amplitude=0.05, seed=seed)

    # Key snapshots matching Yadav et al. (2024) Fig. 6(d) (e.g. t = 0, 2, 10, 100)
    key_times = [0.0, 2.0, 10.0, 25.0, 50.0, 100.0]
    
    # Also save periodic snapshots every 1.0 unit for smooth animation
    anim_times = np.arange(0.0, cfg.t_final + 0.5, 1.0)
    combined_times = sorted(list(set(key_times + list(anim_times))))

    print("Simulating 2D TDGL forward in time...")
    res = simulate_2d(
        config=cfg,
        phi_init=phi0,
        save_times=combined_times,
        diag_interval=0.5
    )

    t_snaps = res["t_snapshots"]
    snaps = res["snapshots"]
    x = res["x"]
    y = res["y"]
    print(f"Simulation completed: {len(t_snaps)} 2D snapshots saved, {len(res['diag_times'])} diagnostics recorded.")

    # Save raw results
    os.makedirs("results/raw", exist_ok=True)
    np.savez_compressed(
        "results/raw/tdgl_2d_random.npz",
        x=x,
        y=y,
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
        Nx=cfg.Nx,
        Ny=cfg.Ny,
        seed=seed,
        noise_amplitude=0.05,
        phi0=0.0
    )
    print("Saved raw simulation data to results/raw/tdgl_2d_random.npz")

    # Save diagnostics CSV
    import csv
    with open("results/raw/tdgl_2d_diagnostics.csv", "w", newline="") as f:
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
    print("Saved 2D diagnostics to results/raw/tdgl_2d_diagnostics.csv")

    # Generate Figure 6: Multi-panel coarsening morphology
    os.makedirs("results/figures", exist_ok=True)
    panel_target_times = [0.0, 2.0, 10.0, 100.0]
    panel_snaps = []
    panel_actual_times = []
    for pt in panel_target_times:
        idx = int(np.argmin(np.abs(t_snaps - pt)))
        panel_snaps.append(snaps[idx])
        panel_actual_times.append(t_snaps[idx])

    plot_2d_coarsening_panels(
        snapshots=panel_snaps,
        times=panel_actual_times,
        L=cfg.L,
        out_path="results/figures/fig6_2d_coarsening_panels.png"
    )
    print("Generated results/figures/fig6_2d_coarsening_panels.png")

    # Generate 2D animation GIF
    os.makedirs("results/animations", exist_ok=True)
    print("Generating 2D animation GIF...")
    frames = []
    fig, ax = plt.subplots(figsize=(4.5, 4.0), dpi=150)
    
    # Use every snapshot for 100 frames
    for i in range(len(snaps)):
        ax.clear()
        t_curr = t_snaps[i]
        im = ax.imshow(
            snaps[i].T,
            origin="lower",
            extent=[0, cfg.L, 0, cfg.L],
            cmap=FIELD_CMAP,
            vmin=-1.0,
            vmax=1.0
        )
        ax.set_title(f"2D TDGL Coarsening: $t = {t_curr:.1f}$")
        ax.set_xlabel("$x$")
        ax.set_ylabel("$y$")
        fig.tight_layout()
        
        fig.canvas.draw()
        rgba = np.array(fig.canvas.buffer_rgba(), copy=True)
        frames.append(Image.fromarray(rgba).copy())
        
    plt.close(fig)

    if frames:
        frames[0].save(
            "results/animations/tdgl_2d_coarsening.gif",
            save_all=True,
            append_images=frames[1:],
            duration=50,
            loop=0
        )
        print("Generated results/animations/tdgl_2d_coarsening.gif")

    # 2D Spectrum analysis
    k_2d, E_modal, E_shell = spectrum_2d(snaps[-1], cfg.dx)
    fit_modal = fit_porod_law(k_2d, E_modal, k_min=0.2, k_max=1.5)
    print(f"2D Modal Spectrum at t=100: exponent = {fit_modal['exponent']:.2f}")

    return res


if __name__ == "__main__":
    run()

