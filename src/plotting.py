"""
plotting.py
Scientific publication-quality plotting utilities for TDGL simulations.
"""

import os
from typing import List, Optional, Tuple, Dict
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from .plot_style import *

# Ensure matplotlib uses a non-interactive backend for headless execution
matplotlib.use("Agg")

# Set standard publication plot aesthetics
plt.rcParams.update({
    "font.size": 11,
    "font.family": "sans-serif",
    "axes.labelsize": 12,
    "axes.titlesize": 13,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "legend.fontsize": 10,
    "figure.titlesize": 14,
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "lines.linewidth": 1.8,
    "axes.grid": True,
    "grid.alpha": 0.35,
    "grid.linestyle": "--"
})


def plot_1d_initial_field(
    x: np.ndarray,
    phi_0: np.ndarray,
    out_path: str,
    title: str = "TDGL 1D: Initial Condition $\\phi(x, 0)$"
) -> None:
    """Figure 1: Initial random fluctuation field."""
    fig, ax = plt.subplots(figsize=(7, 3.5))
    ax.plot(x, phi_0, color=FIELD, lw=1.2, label=r"$\phi(x, 0) = \phi_0 + \delta\phi$ ($\phi_0=0$)")
    ax.axhline(0, color="k", ls=":", alpha=0.6)
    ax.set_xlim(x[0], x[-1])
    ax.set_ylim(-0.15, 0.15)
    ax.set_xlabel("Spatial coordinate $x$")
    ax.set_ylabel(r"Order parameter $\phi$")
    ax.set_title(title)
    ax.legend(loc="upper right")
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_1d_multi_curves(
    x: np.ndarray,
    snapshots: np.ndarray,
    times: np.ndarray,
    selected_times: List[float],
    out_path: str,
    title: str = "TDGL 1D: Domain Coarsening Evolution $\\phi(x, t)$"
) -> None:
    """Figure 2: Several phi(x, t) curves on one graph across evolution times."""
    fig, ax = plt.subplots(figsize=(8, 4.5))
    
    # Palette across times
    colors = [time_color(t) for t in selected_times]
    
    for idx_target, t_target in enumerate(selected_times):
        # find closest snapshot
        t_idx = int(np.argmin(np.abs(times - t_target)))
        actual_t = times[t_idx]
        ax.plot(x, snapshots[t_idx], color=time_color(actual_t), label=f"$t = {actual_t:.1f}$")
        
    ax.axhline(+1.0, color="gray", ls="--", alpha=0.7, label=r"Equilibrium $\phi = \pm 1$")
    ax.axhline(-1.0, color="gray", ls="--", alpha=0.7)
    ax.axhline(0.0, color="black", ls=":", alpha=0.4)
    ax.set_xlim(x[0], x[-1])
    ax.set_ylim(-1.25, 1.25)
    ax.set_xlabel("Spatial coordinate $x$")
    ax.set_ylabel(r"Order parameter $\phi(x, t)$")
    ax.set_title(title)
    ax.legend(loc="center left", bbox_to_anchor=(1.02, 0.5), frameon=True)
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_1d_spacetime_heatmap(
    x: np.ndarray,
    times: np.ndarray,
    field_history: np.ndarray,
    out_path: str,
    title: str = r"TDGL 1D: Space-Time Diagram $\phi(x, t)$"
) -> None:
    """Figure 3: Space-time diagram x vs t colored by phi using actual coordinates (pcolormesh)."""
    fig, ax = plt.subplots(figsize=(8, 5.5))
    # X, T meshgrid matching field_history of shape (N_times, N_x)
    X, T = np.meshgrid(x, times)
    im = ax.pcolormesh(
        X, T, field_history,
        shading="auto",
        cmap=FIELD_CMAP,
        vmin=-1.0,
        vmax=1.0
    )
    cbar = fig.colorbar(im, ax=ax, pad=0.02)
    cbar.set_label(r"Order parameter $\phi(x, t)$")
    ax.set_xlim(x[0], x[-1])
    ax.set_ylim(times[0], times[-1])
    ax.set_xlabel("Spatial coordinate $x$")
    ax.set_ylabel("Time $t$")
    ax.set_title(title)
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_1d_kink_antikink_evolution(
    x: np.ndarray,
    snapshots: np.ndarray,
    times: np.ndarray,
    selected_indices: List[int],
    out_path: str,
    title: str = "TDGL 1D: Kink–Antikink Attraction and Annihilation"
) -> None:
    """Figure 4: Kink-antikink mutual attraction and merger."""
    fig, ax = plt.subplots(figsize=(8, 4.5))
    colors = [time_color(times[i]) for i in selected_indices]
    
    for idx, s_idx in enumerate(selected_indices):
        t_val = times[s_idx]
        ax.plot(x, snapshots[s_idx], color=colors[idx], label=f"$t = {t_val:.1f}$")
        
    ax.axhline(+1.0, color="gray", ls="--", alpha=0.5)
    ax.axhline(-1.0, color="gray", ls="--", alpha=0.5)
    ax.set_xlim(x[0], x[-1])
    ax.set_ylim(-1.3, 1.3)
    ax.set_xlabel("Spatial coordinate $x$")
    ax.set_ylabel(r"$\phi(x, t)$")
    ax.set_title(title)
    ax.legend(loc="lower right")
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_1d_final_profile(
    x: np.ndarray,
    phi_final: np.ndarray,
    t_final: float,
    out_path: str,
    title: str = "TDGL 1D: Final Ordered Profile"
) -> None:
    """Figure 5: Final ordered state showing plateau at phi ~ +/-1."""
    fig, ax = plt.subplots(figsize=(7, 3.5))
    ax.plot(x, phi_final, color=FIELD, lw=2.0, label=f"Final state ($t = {t_final:.1f}$)")
    ax.axhline(+1.0, color="gray", ls="--", alpha=0.7, label=r"Equilibrium $\phi = \pm 1$")
    ax.axhline(-1.0, color="gray", ls="--", alpha=0.7)
    ax.set_xlim(x[0], x[-1])
    ax.set_ylim(-1.2, 1.2)
    ax.set_xlabel("Spatial coordinate $x$")
    ax.set_ylabel(r"Order parameter $\phi$")
    ax.set_title(title)
    ax.legend(loc="center right")
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_2d_coarsening_panels(
    snapshots: List[np.ndarray],
    times: List[float],
    L: float,
    out_path: str,
    title: str = "TDGL 2D: Domain Coarsening Morphology"
) -> None:
    """
    Figure 6: Multi-panel figure of 2D field at t = 0, early, intermediate, late
    using a diverging colormap where phi < 0 is blue, phi > 0 is red, phi = 0 is white.
    """
    num_snaps = len(snapshots)
    fig, axes = plt.subplots(1, num_snaps, figsize=(3.8 * num_snaps, 3.8))
    if num_snaps == 1:
        axes = [axes]
        
    for idx, (ax, snap, t) in enumerate(zip(axes, snapshots, times)):
        im = ax.imshow(
            snap.T,
            origin="lower",
            extent=[0, L, 0, L],
            cmap=FIELD_CMAP,
            vmin=-1.0,
            vmax=1.0
        )
        ax.set_title(f"$t = {t:.1f}$", fontsize=12)
        ax.set_xlabel("$x$")
        if idx == 0:
            ax.set_ylabel("$y$")
        else:
            ax.set_yticklabels([])
            
    fig.subplots_adjust(right=0.88, wspace=0.15)
    cbar_ax = fig.add_axes([0.90, 0.20, 0.02, 0.60])
    cbar = fig.colorbar(im, cax=cbar_ax)
    cbar.set_label(r"Order Parameter $\phi(\mathbf{r}, t)$", fontsize=11)
    
    fig.suptitle(title, fontsize=14, y=0.98)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_free_energy_curves(
    diag_1d: Dict[str, np.ndarray],
    diag_2d: Dict[str, np.ndarray],
    out_path_1d: str,
    out_path_2d: str
) -> None:
    """Figure 7: Free energy F(t) vs time for 1D and 2D verifying monotonic decrease."""
    # 1D plot
    fig1, ax1 = plt.subplots(figsize=(6.5, 4.0))
    ax1.plot(diag_1d["diag_times"], diag_1d["free_energy"], color=ENERGY, lw=2.0, label="1D TDGL $F(t)$")
    ax1.set_xlabel("Time $t$")
    ax1.set_ylabel("Total Free Energy $F(t)$")
    ax1.set_title("1D TDGL: Monotonic Free Energy Dissipation")
    ax1.legend(loc="upper right")
    fig1.tight_layout()
    os.makedirs(os.path.dirname(out_path_1d), exist_ok=True)
    fig1.savefig(out_path_1d)
    plt.close(fig1)

    # 2D plot
    fig2, ax2 = plt.subplots(figsize=(6.5, 4.0))
    ax2.plot(diag_2d["diag_times"], diag_2d["free_energy"], color=ENERGY, lw=2.0, label="2D TDGL $F(t)$")
    ax2.set_xlabel("Time $t$")
    ax2.set_ylabel("Total Free Energy $F(t)$")
    ax2.set_title("2D TDGL: Monotonic Free Energy Dissipation")
    ax2.legend(loc="upper right")
    fig2.tight_layout()
    os.makedirs(os.path.dirname(out_path_2d), exist_ok=True)
    fig2.savefig(out_path_2d)
    plt.close(fig2)


def plot_convergence(
    conv_data: Dict[str, np.ndarray],
    out_path: str
) -> None:
    """Figure 8: Spatial convergence log-log plot ||R|| vs dx."""
    dx = conv_data["dx"]
    l2_err = conv_data["l2_errors"]
    linf_err = conv_data["linf_errors"]
    p_l2 = conv_data["p_l2"]
    p_linf = conv_data["p_linf"]

    fig, ax = plt.subplots(figsize=(6.5, 4.5))
    ax.loglog(dx, l2_err, "o-", color=MEAN, lw=2.0, label=f"$L_2$ Norm (fitted slope $p = {p_l2:.2f}$)")
    ax.loglog(dx, linf_err, "s--", color=MAX_ERROR, lw=1.8, label=f"$L_\\infty$ Norm (fitted slope $p = {p_linf:.2f}$)")
    
    # Reference quadratic slope line
    ref_dx = np.array([dx[0], dx[-1]])
    ref_line = l2_err[0] * (ref_dx / ref_dx[0]) ** 2
    ax.loglog(ref_dx, ref_line, "k:", lw=1.5, label="Theoretical $O(\\Delta x^2)$ reference")

    ax.set_xlabel(r"Grid spacing $\Delta x$")
    ax.set_ylabel(r"Analytical Kink Residual $\|R\|$")
    ax.set_title(r"Spatial Truncation Error Convergence: $\|R\| \propto (\Delta x)^p$")
    ax.legend(loc="lower right")
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_spectra(
    k_1d: np.ndarray,
    E_1d: np.ndarray,
    k_2d: np.ndarray,
    E_2d_modal: np.ndarray,
    fit_1d: Dict[str, float],
    fit_2d: Dict[str, float],
    out_path: str
) -> None:
    """Figure 9: Fourier modal energy spectra E(k, t) in 1D and 2D with Porod power-law fits."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    
    # 1D plot
    valid_1d = (k_1d > 0.05) & (k_1d < 3.0) & (E_1d > 0)
    ax1.loglog(k_1d[k_1d > 0], E_1d[k_1d > 0], "o", color=HARDENED, ms=3.5, alpha=0.7, label=r"Measured $E(k)$")
    if not np.isnan(fit_1d["exponent"]):
        fit_k = np.linspace(fit_1d["k_min"], fit_1d["k_max"], 50)
        fit_E = fit_1d["amplitude"] * (fit_k ** fit_1d["exponent"])
        ax1.loglog(fit_k, fit_E, "--", color=REFERENCE, lw=2.2, label=f"Fit: $k^{{{fit_1d['exponent']:.2f}}}$ (Porod $k^{{-2}}$)")
    ax1.set_xlabel(r"Wavenumber $k$")
    ax1.set_ylabel(r"Modal Energy $E(k, t)$")
    ax1.set_title(r"1D TDGL Energy Spectrum ($D=1$)")
    ax1.legend(loc="lower left")

    # 2D plot
    valid_2d = (k_2d > 0.1) & (k_2d < 2.5) & (E_2d_modal > 0)
    ax2.loglog(k_2d[k_2d > 0], E_2d_modal[k_2d > 0], "s", color=HARDENED, ms=4, alpha=0.7, label=r"Measured $E_{\mathrm{modal}}(k)$")
    if not np.isnan(fit_2d["exponent"]):
        fit_k2 = np.linspace(fit_2d["k_min"], fit_2d["k_max"], 50)
        fit_E2 = fit_2d["amplitude"] * (fit_k2 ** fit_2d["exponent"])
        ax2.loglog(fit_k2, fit_E2, "--", color=REFERENCE, lw=2.2, label=f"Fit: $k^{{{fit_2d['exponent']:.2f}}}$ (Porod $k^{{-3}}$)")
    ax2.set_xlabel(r"Wavenumber $k$")
    ax2.set_ylabel(r"Angle-Averaged Modal Energy $E_{\mathrm{modal}}(k)$")
    ax2.set_title(r"2D TDGL Energy Spectrum ($D=2$)")
    ax2.legend(loc="lower left")

    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)


def plot_workflow_diagram(out_path: str) -> None:
    """Figure 10: TDGL equation, physics and numerical workflow diagram."""
    fig, ax = plt.subplots(figsize=(9, 4.8))
    ax.axis("off")

    # Draw workflow boxes
    boxes = [
        {"x": 0.05, "y": 0.55, "w": 0.25, "h": 0.35, "title": "1. Physical Model (Model A)",
         "text": "Order Parameter $\\phi(\\mathbf{r}, t)$\nFree Energy $F[\\phi]$\nRelaxational Dynamics:\n$\\partial_t\\phi = -\\delta F / \\delta\\phi$\n$= \\phi - \\phi^3 + \\nabla^2\\phi$", "color": "#d9eaf7"},
        {"x": 0.38, "y": 0.55, "w": 0.25, "h": 0.35, "title": "2. Numerical Scheme",
         "text": "Central Diff Laplacian:\n$\\nabla^2_h\\phi = \\frac{\\sum_{\\text{nb}} - 2D\\phi}{\\Delta x^2}$\nForward Euler:\n$\\phi^{n+1} = \\phi^n + \\Delta t [\\text{RHS}^n]$\nPeriodic BCs on $[0, L)^D$", "color": "#fff2cc"},
        {"x": 0.71, "y": 0.55, "w": 0.25, "h": 0.35, "title": "3. Stability Bound",
         "text": "Yadav et al. (2024):\n$\\Delta t \\leq \\frac{(\\Delta x)^2}{(\\Delta x)^2 + 2D}$\n1D: $\\Delta t_{\\max} \\approx 4.75\\times 10^{-3}$\n2D: $\\Delta t_{\\max} = 0.20$\nSafe: $\\Delta t \\ll \\Delta t_{\\max}$", "color": "#e2efda"},
        {"x": 0.05, "y": 0.08, "w": 0.40, "h": 0.35, "title": "4. Initial Conditions",
         "text": "• Case A: Quench $\\phi_0=0, \\delta\\phi \\in [-0.05, 0.05]$\n• Case B: Kink $\\phi(x) = \\tanh((x-x_0)/\\sqrt{2})$\n• Case C: Kink-Antikink pair ($R(t) \\to 0$)\n• Case D: Biased $\\langle\\phi\\rangle = 0.2$", "color": "#fce4d6"},
        {"x": 0.52, "y": 0.08, "w": 0.44, "h": 0.35, "title": "5. Validation & Diagnostics",
         "text": "• Uniform Fixed Points: $\\phi^* = \\pm 1$ stable, $0$ unstable\n• Kink residual convergence $p \\approx 2.0$\n• Free energy monotonicity $dF/dt \\leq 0$\n• Spatial order diagnostics $\\langle\\phi\\rangle, \\langle\\phi^2\\rangle, F(t)$\n• Modal Fourier spectra & Porod scaling $k^{-(D+1)}$", "color": "#ededed"}
    ]

    from matplotlib.patches import FancyBboxPatch

    for b in boxes:
        rect = FancyBboxPatch(
            (b["x"], b["y"]), b["w"], b["h"],
            boxstyle="round,pad=0.015,rounding_size=0.02",
            facecolor=b["color"], edgecolor="#555555", lw=1.5
        )
        ax.add_patch(rect)
        ax.text(b["x"] + 0.015, b["y"] + b["h"] - 0.06, b["title"], fontsize=10.5, fontweight="bold", color="#111111")
        ax.text(b["x"] + 0.015, b["y"] + 0.03, b["text"], fontsize=9.0, color="#222222", va="bottom")

    # Connect arrows
    ax.annotate("", xy=(0.37, 0.72), xytext=(0.31, 0.72), arrowprops=dict(arrowstyle="->", lw=2, color="#333333"))
    ax.annotate("", xy=(0.70, 0.72), xytext=(0.64, 0.72), arrowprops=dict(arrowstyle="->", lw=2, color="#333333"))
    ax.annotate("", xy=(0.51, 0.25), xytext=(0.46, 0.25), arrowprops=dict(arrowstyle="->", lw=2, color="#333333"))

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)
