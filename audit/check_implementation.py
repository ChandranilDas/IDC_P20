"""Independent verification of the Antigravity implementation and saved results."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root))
from src import tdgl_core as c
results={}
rng=np.random.default_rng(107)
for shape,spacings in [((63,),(.3,)),((32,24),(.6,.8))]:
 p=rng.uniform(-.8,.8,shape);v=rng.normal(size=shape); eps=1e-6
 if p.ndim==1:
  energy=lambda a:c.free_energy_1d(a,*spacings)
  rhs=lambda a:c.tdgl_rhs_1d(a,*spacings)
 else:
  energy=lambda a:c.free_energy_2d(a,*spacings)
  rhs=lambda a:c.tdgl_rhs_2d(a,*spacings)
 derivative=(energy(p+eps*v)-energy(p-eps*v))/(2*eps)
 target=-np.prod(spacings)*np.sum(rhs(p)*v)
 err=abs(derivative-target)/max(1,abs(target))
 results[f'energy_gradient_{p.ndim}d']={'relative_error':float(err),'passed':bool(err<1e-7)}
 # Check periodic discrete Fourier eigenfunction, including unequal spacing.
 wave=np.ones(shape,dtype=complex); eigenvalue=0
 for axis,(n,h) in enumerate(zip(shape,spacings)):
  m=3; x=np.arange(n); sh=[1]*len(shape);sh[axis]=n
  wave*=np.exp(2j*np.pi*m*x/n).reshape(sh)
  eigenvalue-=4*np.sin(np.pi*m/n)**2/h**2
 lap=c.laplacian_1d(wave,*spacings) if len(shape)==1 else c.laplacian_2d(wave,*spacings)
 error=float(np.max(np.abs(lap-eigenvalue*wave)))
 results[f'periodic_fourier_{len(shape)}d']={'max_error':error,'passed':error<1e-10}
# Independent integration from archived initial field to first positive saved time.
for name in ['tdgl_1d_random','tdgl_2d_random']:
 d=np.load(root/'results/raw'/f'{name}.npz'); p=d['snapshots'][0].copy(); dt=float(d['dt']);dx=float(d['dx'])
 target_t=float(d['t_snapshots'][1]); steps=round(target_t/dt)
 def independent_energy(a):
  e=np.sum((a*a-1)**2/4-.25)
  for axis in range(a.ndim):e+=.5*np.sum((np.roll(a,-1,axis=axis)-a)**2)/dx**2
  return e*dx**a.ndim
 previous=independent_energy(p);max_increase=-np.inf
 for i in range(steps):
  lap=np.zeros_like(p)
  for axis in range(p.ndim):lap+=(np.roll(p,1,axis=axis)+np.roll(p,-1,axis=axis)-2*p)/dx**2
  p=p+dt*(p-p*p*p+lap)
  current=independent_energy(p);max_increase=max(max_increase,current-previous);previous=current
 mismatch=float(np.max(np.abs(p-d['snapshots'][1])))
 stored_energy=independent_energy(d['snapshots'][0])
 results[name]={'independent_steps':steps,'comparison_time':target_t,'snapshot_max_error':mismatch,'max_step_energy_increase':float(max_increase),'initial_energy_error':float(abs(stored_energy-d['free_energy'][0])),'all_saved_fields_finite':bool(np.isfinite(d['snapshots']).all()),'passed':bool(mismatch<1e-10 and max_increase<1e-9 and abs(stored_energy-d['free_energy'][0])<1e-8)}
print(json.dumps(results,indent=2))
Path(sys.argv[1]).write_text(json.dumps(results,indent=2)+'\n')
sys.exit(0 if all(r['passed'] for r in results.values()) else 1)
