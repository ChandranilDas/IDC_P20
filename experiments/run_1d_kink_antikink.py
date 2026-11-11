"""
experiments/run_1d_kink_antikink.py
Case C: Kink-Antikink pair attraction, interaction, and annihilation.

Simulates two opposing domain walls:
    phi(x, 0) = tanh((x - x1)/sqrt(2)) - tanh((x - x2)/sqrt(2)) - 1
with x1 = 0.45*L, x2 = 0.55*L on L = 100.
Generates:
    - results/raw/tdgl_1d_kink_antikink.npz
    - results/figures/fig4_1d_kink_antikink.png
"""

import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.tdgl_core import TDGL1DConfig
from src.initial_conditions import make_kink_antikink_1d
from src.tdgl_1d import simulate_1d
from src.plotting import plot_1d_kink_antikink_evolution


def run():
    print("=" * 60)
    print("Running 1D Kink-Antikink Interaction Experiment (Case C)")
    print("=" * 60)

    # In Verma et al. (2023) Sec. V A, the authors used x1 = 0.45*L, x2 = 0.55*L on L = 100,
    # giving initial separation R0 = 10.0, which required t_final = 30,000 steps to merge
    # due to exponential decay of attractive velocity: dR/dt = -exp(-R / xi_int), xi_int = 1/(2*sqrt(2)).
    # In our benchmark run, we choose x1 = 46.5, x2 = 53.5 on L = 100, yielding R0 = 7.0.
    # This clearly differs from the paper's R0 = 10.0, allowing complete defect attraction
    # and merger to be observed within a practical simulation window (t_final = 800.0).
    cfg = TDGL1DConfig(L=100.0, N=1024, dt=1.0e-3, t_final=800.0)
    x = cfg.x
    x1 = 46.5
    x2 = 53.5
    R0 = x2 - x1
    phi_init = make_kink_antikink_1d(x, x1=x1, x2=x2, L=cfg.L)

    save_times = [0.0, 50.0, 150.0, 300.0, 450.0, 550.0, 650.0, 750.0, 800.0]

    print("Simulating kink-antikink evolution...")
    res = simulate_1d(
        config=cfg,
        phi_init=phi_init,
        save_times=save_times,
        diag_interval=1.0
    )

    t_snaps = res["t_snapshots"]
    snaps = res["snapshots"]

    os.makedirs("results/raw", exist_ok=True)
    np.savez_compressed(
        "results/raw/tdgl_1d_kink_antikink.npz",
        x=x,
        t_snapshots=t_snaps,
        snapshots=snaps,
        diag_times=res["diag_times"],
        free_energy=res["free_energy"],
        mean_phi=res["mean_phi"],
        R0=R0,
        x1=x1,
        x2=x2,
        L=cfg.L,
        N=cfg.N,
        dt=cfg.dt,
        dx=cfg.dx
    )
    print("Saved raw data to results/raw/tdgl_1d_kink_antikink.npz")

    # Generate Figure 4
    os.makedirs("results/figures", exist_ok=True)
    # Pick representative indices spanning from separated to merging to uniform
    selected_indices = list(range(len(snaps)))
    plot_1d_kink_antikink_evolution(
        x=x,
        snapshots=snaps,
        times=t_snaps,
        selected_indices=selected_indices,
        out_path="results/figures/fig4_1d_kink_antikink.png"
    )
    print("Generated results/figures/fig4_1d_kink_antikink.png")
    return res


if __name__ == "__main__":
    run()

