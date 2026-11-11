r"""
spectra.py
Fourier spectral energy analysis and Porod-law scaling diagnostics.

Conventions:
    Continuous/Discrete Parseval normalization:
        For 1D:
            Uses rfft for real input fields (valid for even and odd N).
            \sum_k E(k) = 0.5 * <phi^2>
        For 2D:
            phi_hat(k_x, k_y) = fft2(phi) / (Nx * Ny)
            E(k_x, k_y) = 0.5 * |phi_hat|^2
            Radial binning covers the full wavenumber domain up to the corners:
                k_max = sqrt(kx_max^2 + ky_max^2)
            \sum_{bins} E_shell(k) = 0.5 * <phi^2> exactly.

Porod's law for sharp domain walls:
    1D: E(k) ~ k^(-2)
    2D: E_modal(k) ~ k^(-3)  (angle-averaged modal energy)
"""

from typing import Tuple, Dict, Optional
import numpy as np


def spectrum_1d(
    phi: np.ndarray,
    dx: float
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute 1D modal energy spectrum E(k, t) using real FFT (rfft).
    Guarantees non-negative wavenumbers and exact energy conservation for both even and odd N:
        sum(E_folded) == 0.5 * mean(phi^2)

    Returns:
        k_vals: positive physical wavenumbers k = 2*pi*m / L
        E_folded: 1D folded modal energy summing +k and -k contributions (k=0 and Nyquist are single)
    """
    N = len(phi)
    # rfft returns N//2 + 1 complex coefficients
    phi_hat = np.fft.rfft(phi) / float(N)
    k_vals = 2.0 * np.pi * np.fft.rfftfreq(N, d=dx)
    
    # Raw one-sided modal energy: 0.5 * |phi_hat|^2
    E_raw = 0.5 * (np.abs(phi_hat) ** 2)
    E_folded = np.zeros_like(E_raw)
    
    if N % 2 == 0:
        # For even N: k=0 and k_Nyquist (index -1) have no negative partner
        E_folded[0] = E_raw[0]
        E_folded[1:-1] = 2.0 * E_raw[1:-1]
        E_folded[-1] = E_raw[-1]
    else:
        # For odd N: only k=0 has no negative partner; all other modes are pairs
        E_folded[0] = E_raw[0]
        E_folded[1:] = 2.0 * E_raw[1:]
        
    return k_vals, E_folded


def spectrum_2d(
    phi: np.ndarray,
    dx: float,
    dy: float = None,
    num_bins: Optional[int] = None
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute 2D radially averaged modal energy spectrum E_modal(k) and shell-summed energy E_shell(k).
    Bins all modes including diagonal corner frequencies up to k_max = sqrt(kx_max^2 + ky_max^2).
    Satisfies exact discrete Parseval conservation:
        sum(E_shell) == 0.5 * mean(phi^2)

    Returns:
        k_centers: radial wavenumber bin centers
        E_modal: angle-averaged modal energy per mode at wavenumber k (scales as k^-3 in 2D Porod regime)
        E_shell: total energy summed over radial shell [k, k+dk) (scales as k^-2 in 2D Porod regime)
    """
    Nx, Ny = phi.shape
    if dy is None:
        dy = dx
    
    # 2D FFT normalized such that sum(|phi_hat|^2) = <phi^2>
    phi_hat = np.fft.fft2(phi) / float(Nx * Ny)
    E_2d = 0.5 * (np.abs(phi_hat) ** 2)
    
    kx = 2.0 * np.pi * np.fft.fftfreq(Nx, d=dx)
    ky = 2.0 * np.pi * np.fft.fftfreq(Ny, d=dy)
    KX, KY = np.meshgrid(kx, ky, indexing='ij')
    K_radial = np.sqrt(KX ** 2 + KY ** 2)
    
    k_max = float(np.max(K_radial))
    if num_bins is None:
        num_bins = int(min(Nx, Ny) // 2)
    
    # Bin edges spanning all radial wavenumbers
    bin_edges = np.linspace(0.0, k_max * (1.0 + 1e-12), num_bins + 1)
    k_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])
    
    E_modal = np.zeros(num_bins)
    E_shell = np.zeros(num_bins)
    
    bin_indices = np.digitize(K_radial.ravel(), bin_edges) - 1
    flat_E = E_2d.ravel()
    
    for b in range(num_bins):
        mask = (bin_indices == b)
        count = int(np.sum(mask))
        if count > 0:
            E_shell[b] = np.sum(flat_E[mask])
            E_modal[b] = E_shell[b] / float(count)
        else:
            E_shell[b] = 0.0
            E_modal[b] = 0.0
            
    return k_centers, E_modal, E_shell


def fit_porod_law(
    k: np.ndarray,
    E: np.ndarray,
    k_min: float,
    k_max: float
) -> Dict[str, float]:
    """
    Fit power-law exponent E(k) ~ A * k^gamma in log-log space:
        log10(E) = gamma * log10(k) + log10(A)

    Note on stderr:
        stderr represents standard regression uncertainty under uncorrelated errors.
        Spatial Fourier modes in domain-coarsening fields possess finite cross-correlations.

    Returns:
        dict with fitted exponent gamma, regression stderr, A, r_squared, and valid count.
    """
    valid = (k >= k_min) & (k <= k_max) & (E > 0.0)
    if np.sum(valid) < 3:
        return {
            "exponent": np.nan,
            "stderr": np.nan,
            "amplitude": np.nan,
            "r_squared": np.nan,
            "num_points": int(np.sum(valid))
        }
    
    log_k = np.log10(k[valid])
    log_E = np.log10(E[valid])
    
    poly, cov = np.polyfit(log_k, log_E, 1, cov=True)
    slope = float(poly[0])
    intercept = float(poly[1])
    slope_err = float(np.sqrt(cov[0, 0])) if cov is not None else 0.0
    
    fit_vals = slope * log_k + intercept
    ss_res = np.sum((log_E - fit_vals) ** 2)
    ss_tot = np.sum((log_E - np.mean(log_E)) ** 2)
    r_squared = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
    
    return {
        "exponent": slope,
        "stderr": slope_err,
        "amplitude": float(10.0 ** intercept),
        "r_squared": r_squared,
        "num_points": int(np.sum(valid)),
        "k_min": float(k_min),
        "k_max": float(k_max)
    }
