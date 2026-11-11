"""Save optional diagnostics from executed fields; no simulation is rerun."""
from pathlib import Path
import sys,json
import numpy as np
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root))
from src.spectra import spectrum_1d,spectrum_2d,fit_porod_law
p1=np.load(root/'results/raw/tdgl_1d_random.npz');p2=np.load(root/'results/raw/tdgl_2d_random.npz')
a=p1['snapshots'][-1];b=p2['snapshots'][-1]
k1,e1=spectrum_1d(a,float(p1['dx']));_,h1=spectrum_1d(np.where(a>=0,1.,-1.),float(p1['dx']))
k2,e2,s2=spectrum_2d(b,float(p2['dx']));_,h2,hs2=spectrum_2d(np.where(b>=0,1.,-1.),float(p2['dx']))
np.savez_compressed(root/'results/raw/spectra_final.npz',k_1d=k1,raw_1d=e1,hardened_1d=h1,k_2d=k2,raw_2d_modal=e2,raw_2d_shell=s2,hardened_2d_modal=h2,hardened_2d_shell=hs2,time_1d=p1['t_snapshots'][-1],time_2d=p2['t_snapshots'][-1])
summary={'1D_hardened':fit_porod_law(k1,h1,.1,1.8),'2D_hardened_modal':fit_porod_law(k2,h2,.15,1.5),'interpretation':'Descriptive single-realization fits. stderr is regression-only; it excludes seed, window and discretization uncertainty.'}
(root/'results/validation/spectral_fits.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
