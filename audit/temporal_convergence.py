import sys,json
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.tdgl_core import euler_step_1d,euler_step_2d
results={}
# Uniform exact nonlinear solution isolates Forward Euler order without a spatial error floor.
a0=.2; T=1.; exact=a0/np.sqrt(a0*a0+(1-a0*a0)*np.exp(-2*T))
for dim in [1,2]:
 errors=[];dts=[.02,.01,.005,.0025]
 for dt in dts:
  p=np.full((16,)*dim,a0)
  for _ in range(round(T/dt)):
   p=euler_step_1d(p,1,dt) if dim==1 else euler_step_2d(p,1,dt)
  errors.append(float(np.max(abs(p-exact))))
 order=float(np.polyfit(np.log(dts),np.log(errors),1)[0])
 results[str(dim)+'D']={'dt':dts,'max_errors':errors,'fitted_order':order,'passed':bool(.95<order<1.05)}
(Path(__file__).parent/'independent_temporal_convergence.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
