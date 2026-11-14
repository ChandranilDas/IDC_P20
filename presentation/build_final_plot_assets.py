from pathlib import Path
import numpy as np,json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import NullFormatter
r=Path(__file__).resolve().parents[1];o=r/'presentation/build/final_assets';o.mkdir(parents=True,exist_ok=True)
one=np.load(r/'results/raw/tdgl_1d_random.npz');two=np.load(r/'results/raw/tdgl_2d_random.npz');k=np.load(r/'results/raw/tdgl_1d_kink.npz');v=json.loads((r/'results/validation/validation_summary.json').read_text())
import sys
sys.path.insert(0,str(r))
from src.plot_style import *
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'grid.alpha':.2,'savefig.dpi':200})
def save(n,f):f.savefig(o/(n+'.png'),bbox_inches='tight',facecolor='white');plt.close(f)
f,axs=plt.subplots(1,3,figsize=(12,3.05))
for ax,t in zip(axs,[0,10,1000]):
 i=np.argmin(abs(one['t_snapshots']-t));ax.plot(one['x'],one['snapshots'][i],color=FIELD,lw=1.4);ax.set(title=f"t = {one['t_snapshots'][i]:g}",xlabel='x',ylim=(-1.12,1.12))
axs[0].set_ylabel(r'$\phi$');f.tight_layout();save('profiles',f)
f,ax=plt.subplots(figsize=(9.3,3.2));im=ax.pcolormesh(one['x'],one['t_snapshots'],one['snapshots'],cmap=FIELD_CMAP,vmin=-1,vmax=1,shading='auto');ax.set(xlabel='x',ylabel='t');f.colorbar(im,ax=ax,label=r'$\phi$');f.tight_layout();save('spacetime',f)
f,axs=plt.subplots(1,3,figsize=(13,3.1))
for ax,t in zip(axs,[0,10,100]):
 i=np.argmin(abs(two['t_snapshots']-t));im=ax.imshow(two['snapshots'][i].T,origin='lower',extent=(0,128,0,128),cmap=FIELD_CMAP,vmin=-1,vmax=1);ax.set(title=f't = {t}',xlabel='x',ylabel='y');ax.grid(False)
f.subplots_adjust(right=.9,wspace=.3);f.colorbar(im,cax=f.add_axes([.93,.15,.015,.7]),label=r'$\phi$');save('morphology',f)
f,axs=plt.subplots(1,2,figsize=(12,3.05))
for ax,d,vol,title in [(axs[0],one,100,'1D'),(axs[1],two,16384,'2D')]:
 ax.plot(d['diag_times'],d['free_energy']/vol,color=ENERGY,label='F / volume');ax.plot(d['diag_times'],d['mean_phi2']/2,color=MOMENT,label=r'$\langle\phi^2\rangle/2$');ax.set(title=title,xlabel='t');ax.legend(fontsize=9)
f.tight_layout();save('energy_moments',f)
f,axs=plt.subplots(1,2,figsize=(10,3.8));xx=k['x']-float(k['L'])/2;m=(abs(xx)<=6)&k['interior_mask'];axs[0].plot(xx[m],k['phi_analytical'][m],color=FIELD,label='Kink');axs[0].set(xlabel=r'$x-x_0$',ylabel=r'$\phi_K$',title='Interior kink residual');ax2=axs[0].twinx();ax2.plot(xx[m],k['residual'][m]*1000,'--',color=RMS,label='Residual');ax2.set_ylabel('Residual × 1000',color=RMS);cv=v['kink_convergence'];axs[1].loglog(cv['dx'],cv['l2_errors'],'o-',color=RMS,label=f"Fit p = {cv['p_l2']:.4f}");axs[1].set(xlabel='h',ylabel='Interior RMS residual',title='Spatial convergence');axs[1].set_xticks([.03,.1,.3],labels=['0.03','0.1','0.3']);axs[1].xaxis.set_minor_formatter(NullFormatter());axs[1].legend();f.tight_layout();save('kink_validation',f)
metrics={}
for name,d in [('1d',one),('2d',two)]:
 field=d['snapshots'][-1];metrics[name]={'mean_abs':float(np.abs(field).mean()),'mean_square_half':float(np.mean(field**2)/2),'energy_density':float(d['free_energy'][-1]/float(d['L'])**field.ndim)}
(o/'metrics.json').write_text(json.dumps(metrics,indent=2))
print(metrics)
