import sys,json,time
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
# Independent formulas; never import project solver or diagnostics.
def energy(p,h):
 e=np.sum(-.5*p*p+.25*p**4)
 for a in range(p.ndim):e+=.5*np.sum((np.roll(p,-1,axis=a)-p)**2)/h**2
 return float(e*h**p.ndim)
summary={}
for name in ['tdgl_1d_random','tdgl_2d_random','tdgl_1d_kink_antikink']:
 d=np.load(root/'results/raw'/f'{name}.npz');p=d['snapshots'][0].copy()
 dt=float(d['dt']) if 'dt' in d else .001;h=float(d['x'][1]-d['x'][0]);ts=d['t_snapshots']
 targets={int(round(t/dt)):i for i,t in enumerate(ts)}
 E=energy(p,h);maxrise=-np.inf;violations=0;err=0.;start=time.monotonic(); samples=[[0.,E]]
 for step in range(1,int(round(ts[-1]/dt))+1):
  lap=np.zeros_like(p)
  for a in range(p.ndim):lap+=(np.roll(p,1,axis=a)+np.roll(p,-1,axis=a)-2*p)/h**2
  p+=dt*(p-p*p*p+lap)
  nextE=energy(p,h);rise=nextE-E;maxrise=max(maxrise,rise);violations+=int(rise>1e-9);E=nextE
  if step in targets:
   err=max(err,float(np.max(np.abs(p-d['snapshots'][targets[step]]))))
   samples.append([step*dt,E])
  if step%100000==0:print(name,step,flush=True)
 summary[name]={'steps':step,'max_energy_increase':maxrise,'energy_violations_above_1e-9':violations,'max_saved_field_discrepancy':err,'final_energy':E,'finite':bool(np.isfinite(p).all()),'elapsed_seconds':time.monotonic()-start,'passed':bool(violations==0 and err<1e-8 and np.isfinite(p).all())}
 np.savetxt(Path(__file__).parent/(name+'_independent_energy.csv'),samples,delimiter=',',header='time,free_energy',comments='')
 print(json.dumps(summary[name]),flush=True)
 (Path(__file__).parent/'independent_full_replay.json').write_text(json.dumps(summary,indent=2))
