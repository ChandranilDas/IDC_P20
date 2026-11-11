"""Interior truncation test for the infinite-line tanh kink.

A single tanh is not periodic. Do not evolve its periodic extension and call it
an exact stationary solution. The periodic dynamics demonstration is the separate
kink-antikink experiment. This script compares the central stencil with the
analytical second derivative only in a fixed interior window.
"""
from pathlib import Path
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root))
from src.tdgl_core import TDGL1DConfig,laplacian_1d
from src.initial_conditions import make_kink_1d
from src.validation import validate_kink_convergence

def run():
    cfg=TDGL1DConfig(L=60,N=512)
    x=cfg.x;phi=make_kink_1d(x,cfg.L/2)
    exact_xx=phi**3-phi
    discrete_xx=laplacian_1d(phi,cfg.dx)
    residual=phi-phi**3+discrete_xx
    interior=(x>=.2*cfg.L)&(x<=.8*cfg.L)
    rms=float(np.sqrt(np.mean(residual[interior]**2)))
    conv=validate_kink_convergence()
    (root/'results/raw').mkdir(parents=True,exist_ok=True)
    np.savez_compressed(root/'results/raw/tdgl_1d_kink.npz',x=x,phi_analytical=phi,phi_xx_analytical=exact_xx,phi_xx_discrete=discrete_xx,residual=residual,interior_mask=interior,dx=cfg.dx,L=cfg.L,N=cfg.N,interior_rms=rms)
    fig,ax=plt.subplots(1,3,figsize=(12,3.4))
    ax[0].plot(x[interior],phi[interior],color='#147d92');ax[0].set(title='Infinite-line kink',xlabel='$x$',ylabel=r'$\phi$')
    ax[1].plot(x[interior],exact_xx[interior],label='Analytical',lw=2)
    ax[1].plot(x[interior],discrete_xx[interior],'--',label='Central stencil');ax[1].set(title='Interior second derivative',xlabel='$x$');ax[1].legend()
    ax[2].plot(x[interior],residual[interior],color='#e96743');ax[2].set(title=f'Interior RMS = {rms:.3g}',xlabel='$x$',ylabel='$R$')
    fig.tight_layout();fig.savefig(root/'results/figures/kink_interior_comparison.png',dpi=200);plt.close(fig)
    print(f'Kink interior RMS residual: {rms:.8g}; refinement order: {conv["p_l2"]:.6f}')
    print('Single kink is nonperiodic; no stationary periodic evolution is claimed.')
    return {'interior_rms':rms,'convergence':conv}
if __name__=='__main__':run()
