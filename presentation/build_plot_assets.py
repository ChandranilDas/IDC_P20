from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image
root=Path(__file__).resolve().parents[1];out=Path(__file__).parent/'assets';out.mkdir(exist_ok=True)
plt.rcParams.update({'font.size':13,'axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold','savefig.bbox':'tight','figure.facecolor':'white','axes.labelcolor':'#203849','text.color':'#203849','xtick.color':'#203849','ytick.color':'#203849'})
d1=np.load(root/'results/raw/tdgl_1d_random.npz');d2=np.load(root/'results/raw/tdgl_2d_random.npz');pair=np.load(root/'results/raw/tdgl_1d_kink_antikink.npz')
f,axs=plt.subplots(1,2,figsize=(10,2.7),gridspec_kw={'wspace':.3})
u=np.linspace(-1.4,1.4,300);axs[0].plot(u,(u*u-1)**2/4,color='#147d92',lw=3);axs[0].set(xlabel=r'$\phi$',ylabel=r'$V(\phi)+1/4$',title='Two ordered phases');axs[0].scatter([-1,1],[0,0],color='#ef7755',s=55,zorder=4)
x=np.linspace(-7,7,300);axs[1].plot(x,np.tanh(x/np.sqrt(2)),lw=3,color='#ef7755');axs[1].set(xlabel='$x-x_0$',ylabel=r'$\phi$',title='A domain wall');f.savefig(out/'foundation.png',dpi=180);plt.close(f)
f,axs=plt.subplots(1,3,figsize=(14.5,4),gridspec_kw={'wspace':.38})
for t,col in zip([0,10,1000],['#8fa0b5','#147d92','#e96743']):
 i=np.argmin(abs(d1['t_snapshots']-t));axs[0].plot(d1['x'],d1['snapshots'][i],label=f't={t}',lw=1.6,color=col)
axs[0].set(xlabel='$x$',ylabel=r'$\phi$',title='Noise becomes domains',ylim=(-1.15,1.15));axs[0].legend(frameon=False,fontsize=10)
im=axs[1].pcolormesh(d1['x'],d1['t_snapshots'],d1['snapshots'],cmap='coolwarm',vmin=-1,vmax=1,shading='nearest',rasterized=True);axs[1].set(xlabel='$x$',ylabel='$t$',title='Six walls persist')
for t,col in zip([0,300,550,800],['#8fa0b5','#147d92','#b06ac2','#e96743']):
 i=np.argmin(abs(pair['t_snapshots']-t));axs[2].plot(pair['x'],pair['snapshots'][i],label=f't={t}',lw=2,color=col)
axs[2].set(xlim=(40,60),ylim=(-1.15,1.15),xlabel='$x$',ylabel=r'$\phi$',title='Separate pair annihilates');axs[2].legend(frameon=False,fontsize=10)
f.savefig(out/'one_d.png',dpi=180);plt.close(f)
f,axs=plt.subplots(1,3,figsize=(13.5,4.2),gridspec_kw={'wspace':.15})
for ax,t in zip(axs,[0,10,100]):
 i=np.argmin(abs(d2['t_snapshots']-t));im=ax.imshow(d2['snapshots'][i].T,cmap='coolwarm',vmin=-1,vmax=1,origin='lower',extent=(0,128,0,128));ax.set(title=f't = {t}',xlabel='$x$');ax.set_xticks([0,64,128]);ax.set_yticks([0,64,128]);ax.grid(False)
axs[0].set_ylabel('$y$');f.colorbar(im,ax=axs,rasterized=True if False else False,shrink=.85,label=r'$\phi$') if False else None
f.subplots_adjust(right=.91);cax=f.add_axes([.93,.17,.014,.66]);f.colorbar(im,cax=cax,label=r'$\phi$',ticks=[-1,0,1]);f.savefig(out/'two_d.png',dpi=180);plt.close(f)
import json
v=json.loads((root/'results/validation/validation_summary.json').read_text());cv=v['kink_convergence'];f,axs=plt.subplots(1,2,figsize=(12,3.4),gridspec_kw={'wspace':.35})
axs[0].loglog(cv['dx'],cv['l2_errors'],'o-',color='#147d92',lw=2);axs[0].set(xlabel=r'$\Delta x$',ylabel='Interior RMS residual',title='Spatial order = 1.9895');axs[0].grid(alpha=.2,which='both');axs[0].set_xticks([.03,.1,.3],labels=['0.03','0.1','0.3']);from matplotlib.ticker import NullFormatter;axs[0].xaxis.set_minor_formatter(NullFormatter())
for d,vol,label,col in [(d1,100,'1D','#147d92'),(d2,128**2,'2D','#e96743')]:axs[1].plot(d['diag_times'],d['free_energy']/vol,label=label,color=col,lw=2)
axs[1].set(xlabel='$t$',ylabel='Free energy / volume',title='Energy decreases');axs[1].legend(frameon=False);axs[1].grid(alpha=.2)
f.savefig(out/'validation.png',dpi=180);plt.close(f)
