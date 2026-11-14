#!/usr/bin/env python3
"""Synchronize current scientific artifacts; --check verifies copies and provenance."""
from pathlib import Path
import hashlib,json,shutil,argparse
import numpy as np
R=Path(__file__).resolve().parents[1]
P=R/'Project20';W=R/'web/public'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def reference_results():
 out={'release':'2026-11-14-synchronized','model':'real scalar nonconserved Model A','equation':'phi_t = phi - phi^3 + laplacian(phi)','space':'periodic nearest-neighbor central differences','time':'forward Euler','energy':'unshifted potential plus forward-edge gradient squared, each edge once','runs':{}}
 for name in ['tdgl_1d_random','tdgl_2d_random','tdgl_1d_kink_antikink']:
  path=R/'results/raw'/f'{name}.npz';d=np.load(path);f=d['snapshots'][-1];dim=f.ndim;vol=float(d['L'])**dim
  v={'source_npz':str(path.relative_to(R)),'source_sha256':digest(path),'initial_field_sha256':hashlib.sha256(d['snapshots'][0].astype('<f8').tobytes()).hexdigest(),'dimension':dim,'shape':list(f.shape),'L':float(d['L']),'dt':float(d['dt']),'t_final':float(d['t_snapshots'][-1]),'steps':int(round(float(d['t_snapshots'][-1])/float(d['dt']))),'mean':float(np.mean(f)),'mean_abs':float(np.mean(np.abs(f))),'mean_square':float(np.mean(f*f)),'mean_square_half':float(np.mean(f*f)/2),'free_energy':float(d['free_energy'][-1]),'energy_density':float(d['free_energy'][-1]/vol)}
  if dim==1:v['periodic_sign_changes']=int(np.count_nonzero(np.sign(f)!=np.roll(np.sign(f),1)))
  out['runs'][name]=v
 return out

def copies():
 report=P/'report/P20_Detailed_Report.pdf';md=P/'report/P20_Detailed_Report.md';ppt=R/'presentation/P20_Final.pptx';nb=R/'notebooks/P20_Simulations.ipynb'
 return [(R/'audit/notebook_execution.json',P/'codes/audit/notebook_execution.json'),(report,R/'docs/P20_Technical_Report.pdf'),(md,R/'docs/P20_Technical_Report.md'),(ppt,R/'presentation/P20_Progress_Presentation.pptx'),(ppt,P/'ppt/P20_Final.pptx'),(report,W/'downloads/P20_Detailed_Report.pdf'),(report,W/'downloads/P20_Technical_Report.pdf'),(md,W/'downloads/P20_Detailed_Report.md'),(md,W/'downloads/P20_Technical_Report.md'),(ppt,W/'downloads/P20_Final.pptx'),(ppt,W/'downloads/P20_Progress_Presentation.pptx'),(nb,W/'downloads/P20_Simulations.ipynb'),(nb,P/'codes/P20_Simulations.ipynb')]

def sync():
 # A fresh checkout can also assemble the scientific submission from canonical files.
 for folder in ['src','experiments','tests','results']:
  shutil.copytree(R/folder,P/'codes'/folder,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','.pytest_cache','.ipynb_checkpoints'))
 for filename in ['requirements.txt','requirements-notebook.txt','pytest.ini']:
  shutil.copy2(R/filename,P/'codes'/filename)
 (P/'codes/docs').mkdir(parents=True,exist_ok=True)
 shutil.copy2(R/'docs/source_notes.md',P/'codes/docs/source_notes.md')
 (P/'codes/audit').mkdir(parents=True,exist_ok=True)
 for name in ['check_implementation.py','replay_runs.py','temporal_convergence.py','save_spectra.py','independent_full_replay.json','independent_temporal_convergence.json','implementation_checks.json','observed_run_summary.json']:
  shutil.copy2(R/'audit'/name,P/'codes/audit'/name)
 if not (P/'README.md').exists():
  (P/'README.md').write_text('# Project20: 1D and 2D Model-A TDGL\n\nChandranil Das (261340004), Devkinandan Sharma (261340005)\nKotak School of Sustainability, M.Tech in AI for Sustainability\n\nSee report/P20_Detailed_Report.pdf, ppt/P20_Final.pptx and codes/P20_Simulations.ipynb. Run scientific commands from codes/. The directory is intentionally unzipped.\n')
 if not (P/'codes/README.md').exists():
  (P/'codes/README.md').write_text('# Runnable TDGL code\n\nFrom this folder, install requirements-notebook.txt and open P20_Simulations.ipynb with Jupyter Lab. Run python -m pytest -q for tests and python experiments/run_all.py for full experiments. Full reruns overwrite generated results. See ../report/P20_Detailed_Report.pdf for equations and validation.\n')
 for src,dst in copies():
  dst.parent.mkdir(parents=True,exist_ok=True)
  if src!=dst:shutil.copy2(src,dst)
 for src,dst in [(P/'report/figures',R/'docs/figures'),(P/'report/figures',W/'downloads/figures')]:shutil.copytree(src,dst,dirs_exist_ok=True)
 ref=reference_results();text=json.dumps(ref,indent=2)+'\n'
 for dst in [R/'results/reference_results.json',P/'codes/results/reference_results.json',W/'generated/reference_results.json']:
  dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(text)
 manifest={'release':ref['release'],'reference_results':'/generated/reference_results.json','files':{}}
 for f in [W/'downloads/P20_Detailed_Report.pdf',W/'downloads/P20_Final.pptx',W/'downloads/P20_Simulations.ipynb',W/'downloads/P20_Detailed_Report.md']:
  manifest['files']['/'+str(f.relative_to(W))]={'sha256':digest(f),'bytes':f.stat().st_size}
 (W/'generated/release_manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 checks=P/'CHECKSUMS.sha256';files=sorted(f for f in P.rglob('*') if f.is_file() and f!=checks and not any(x in f.parts for x in ['__pycache__','.pytest_cache','.ipynb_checkpoints']))
 checks.write_text(''.join(digest(f)+'  '+str(f.relative_to(P))+'\n' for f in files))
 return manifest

def check():
 from zipfile import ZipFile
 from xml.etree import ElementTree as ET
 for src,dst in copies():assert digest(src)==digest(dst),(src,dst)
 expected=reference_results()
 from pypdf import PdfReader
 report_text=' '.join(page.extract_text() for page in PdfReader(P/'report/P20_Detailed_Report.pdf').pages)
 for name in ['tdgl_1d_random','tdgl_2d_random']:
  for key in ['free_energy','mean_square']:
   value=f"{expected['runs'][name][key]:.9f}"
   assert value in report_text,(name,key,value)
 with ZipFile(R/'presentation/P20_Final.pptx') as archive:
  slides={i:' '.join(ET.fromstring(archive.read(f'ppt/slides/slide{i}.xml')).itertext()) for i in (3,4,5)}
 for number,name in [(3,'tdgl_1d_random'),(4,'tdgl_2d_random')]:
  for key in ['mean_abs','mean_square_half','energy_density']:
   value=f"{expected['runs'][name][key]:.4f}".replace('-','−')
   assert value in slides[number],(number,key,value)
 convergence=json.loads((R/'results/validation/validation_summary.json').read_text())['kink_convergence']['p_l2']
 assert f"{convergence:.4f}" in slides[5]
 assert '13 / 13' in slides[5]
 for path in [R/'results/reference_results.json',P/'codes/results/reference_results.json',W/'generated/reference_results.json']:assert json.loads(path.read_text())==expected,path
 for f in (P/'codes/results/raw').iterdir():assert digest(f)==digest(R/'results/raw'/f.name),f
 for rel,info in json.loads((W/'generated/release_manifest.json').read_text())['files'].items():assert digest(W/rel.lstrip('/'))==info['sha256'],rel
 print('PASS: all current report/PPT/notebook copies and source arrays match; reference metrics recompute exactly.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
 if not args.check:sync()
 check()
