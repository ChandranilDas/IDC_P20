import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const runtimeRequire=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
const {Presentation,PresentationFile,FileBlob}=await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),build=path.join(base,'presentation/build/final_assets');
await fs.mkdir(build,{recursive:true});await fs.mkdir(path.join(base,'presentation/regenerated'),{recursive:true});
const p=await PresentationFile.importPptx(await FileBlob.load(path.join(base,'presentation/P20_Final.pptx')));
const inspection=await p.inspect({kind:'slide,textbox,image,table,chart',maxChars:90000});
const metrics=JSON.parse(await fs.readFile(path.join(build,'metrics.json'),'utf8'));
const changes=new Map([
 ['Chandranil Das  •  Devkinandan Sharma','Chandranil Das (261340004) · Devkinandan Sharma (261340005)'],
 ['IDC612 – Math & Computation Using Python  |  IIT Kanpur','Kotak School of Sustainability\nM.Tech in AI for Sustainability · IIT Kanpur'],
 ['Numerically reproduce the 1D and 2D domain-coarsening dynamics and validate the solver against the physics and exact kink solution.','Compute domain ordering and verify the periodic finite-difference solver against analytical and numerical benchmarks.'],
 ['This presentation keeps only the core P20 story: model → method → 1D → 2D → validation/conclusion.','Figures and numbers use the full archived Python runs. The live app also offers shorter, labelled demonstrations.'],
 ['generated IC','Numerical IC'],
 ['What is solved, and how?','Model and finite-difference method'],
 ['One slide contains the physics, discretization, initial condition and exact run parameters.','Dimensionless Model A, periodic central differences and forward Euler.'],
 ['Therefore  dF/dt ≤ 0','Continuous flow: dF/dt ≤ 0'],
 ['Exact 1D stationary wall','Infinite-line stationary wall'],
 ['used later for validation','interior residual benchmark'],
 ['φ(r,0)=δφ,   δφ∈[−0.05,0.05],   zero sample mean','φ(r,0)=δφ, δφ∈[−0.05,0.05]; zero expectation'],
 ['Stability condition:  Δt ≤ Δx² /(Δx² + 2d)','Ordered-state linear bound: Δt ≤ Δx²/(Δx² + 2d)'],
 ['Domain formation, kink walls and slow coarsening','1D ordering: six walls remain at t = 1000'],
 ['The space–time map makes the mechanism visible: domain boundaries move and occasionally annihilate. Persistent vertical walls correspond to metastable 1D interfaces described in the reference paper.','Six periodic domain walls remain at t=1000. The field has locally ordered regions but has not reached a uniform phase. Both plots show the actual archived trajectory.'],
 ['0.9608','0.8824'],['0.4717','0.4152'],['−0.2312','−0.1934'],
 ['high curvature\n↓\nsmall domains shrink\n↓\nlarger domains survive\n↓\nlength scale grows','Interfaces smooth\n\nSmall regions disappear\n\nCoarsening morphology\n\nNo growth exponent fitted'],
 ['Final 2D:  ⟨|φ|⟩=0.9375,  ⟨φ²⟩/2=0.4545,  F/V=−0.2206','Final 2D: ⟨|φ|⟩=0.9354\n⟨φ²⟩/2=0.4530, F/V=−0.2185'],
 ['The solver passes analytical checks, not just visual ones','Validation of the numerical solver'],
 ['This is the evidence that the numerical result is trustworthy.','Analytical benchmarks, consistent energy diagnostics and independent replay.'],
 ['both Δt values satisfy the reference stability limit','both Δt values satisfy the linear bound'],
 ['free energy is monotonic in both runs','1.81M steps: no energy rise > 10⁻⁹'],
 ['kink residual gives p = 1.993','interior kink residual: p = 1.9895'],
 ['5 / 5 automated tests pass','13 / 13 Python tests pass'],
 ['Bottom line: the core P20 requirement has been implemented, executed and independently validated.','All reported fields and metrics come from executed simulations and independent checks.'],
 ['Optional extension only: reproduce the full nonlinear spectral-transfer T(k,t) analysis from the reference papers.','Limits: single random seed, finite observation times and coarse 2D interfaces. No universal growth law claimed.'],
]);
for(const r of inspection.records??[]){
 if(r.kind!=='textbox')continue;
 let next=changes.get(r.text);
 if(r.slideIndex===2 && Math.abs(r.position.top-548.16)<1){next=r.position.left<850?metrics['1d'].mean_abs.toFixed(4):r.position.left<1020?metrics['1d'].mean_square_half.toFixed(4):metrics['1d'].energy_density.toFixed(4).replace('-','−');}
 if(r.slideIndex===3 && r.text.startsWith('Final 2D:'))next=`Final 2D: ⟨|φ|⟩=${metrics['2d'].mean_abs.toFixed(4)}\n⟨φ²⟩/2=${metrics['2d'].mean_square_half.toFixed(4)}, F/V=${metrics['2d'].energy_density.toFixed(4).replace('-','−')}`;
 if(next!==undefined){let obj=p.resolve(r.id);obj.text.replace(r.text,next);
  if(r.text.startsWith('Chandranil Das'))obj.text.fontSize=16;
  if(r.text.startsWith('IDC612')){obj.text.fontSize=15;obj.position={...r.position,height:55};}
  if(r.text.startsWith('Final 2D:')){obj.position={...r.position,top:566,height:32};obj.text.fontSize=11;}
 }
}
for(const r of inspection.records??[]){if(r.slideIndex===0 && r.text==='idc-p20.vercel.app'){p.resolve(r.id).position={...r.position,top:570,height:14};}}
// Update the shared course footer on every inherited layout/master.
for(const layout of [...p.masters.items,...p.layouts.items]){
 for(const sh of layout.shapes?.items??[]){
  try{sh.text.replace('IDC612','IDC606');}catch{}
 }
}
const images=(inspection.records??[]).filter(r=>r.kind==='image');
const names=['profiles','spacetime','morphology','energy_moments','kink_validation'];
for(let i=0;i<images.length;i++){
 const obj=p.resolve(images[i].id),frame=obj.frame,crop=obj.crop,fit=obj.fit;
 const bytes=await fs.readFile(path.join(build,names[i]+'.png'));
 obj.replace({blob:bytes,contentType:'image/png',alt:'Actual simulation data: '+names[i],fit:'contain'});
 if(frame)obj.frame=frame;if(crop)obj.crop=crop;
}
const notes=[
'Project20. Authors: Chandranil Das 261340004 and Devkinandan Sharma 261340005. Kotak School of Sustainability, M.Tech in AI for Sustainability. Sources: Verma et al. PRE107034207 (2023), Yadav et al. PRE110044130 (2024). Figures and summaries derive from results/raw NumPy archives. No external dataset.',
'Yadav et al. (2024) Table I and Eq35. Use unshifted GL free energy and forward-edge differences matched to the periodic nearest-neighbor stencil. The time-step bound is linear near ordered states, not unconditional nonlinear/energy stability. Noise expectation is zero, but sample means are not forced to zero. A single tanh is nonperiodic and only its interior residual is tested.',
'Actual tdgl_1d_random.npz, seed42 default_rng, L100 N1024 dt0.001 t_final1000. Six walls remain. Final mean_abs='+0.8824038884198395+', mean_square/2='+0.4151693534189593+', F/L='+(-0.19344051078645472)+'. Both plots use this same archive, with actual time coordinates.',
'Actual tdgl_2d_random.npz, L128 Nx=Ny128 dt.01 t_final100. Final mean_abs0.9354388494349488, mean_square/2 0.45303124816685036, F/L² -0.218481887262061. Images plot phi.T with origin lower. Bottom diagnostics show actual 1D and2D times separately. h1 is coarse relative to sqrt2 interface width. No growth exponent fitted.',
'13 Python tests pass. Kink interior RMS order1.989471479830743; maximum norm1.9664026638547067. Uniform nonlinear exact-solution temporal order0.9986015210509227 in both dimensions. Independent replay:1,000,000+10,000+800,000 steps, no energy increase above1e-9, maximum archived-field discrepancy2.4908720919203375e-12. A single isolated kink is an infinite-line analytic solution; its interior residual test does not impose periodic single-kink equilibrium. Optional nonlinear transfer analysis is not performed.'
];
for(let i=0;i<5;i++)p.slides.items[i].speakerNotes.text=notes[i];
const candidate=path.join(build,'corrected-candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
for(let i=0;i<5;i++)await fs.writeFile(path.join(build,`after-${i+1}.png`),new Uint8Array(await(await p.slides.items[i].export({format:'png',scale:1})).arrayBuffer()));
const skill=process.env.CODEX_PRESENTATION_SKILL_DIR;if(!skill)throw new Error('Set CODEX_PRESENTATION_SKILL_DIR');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const finalPath=path.join(base,'presentation/regenerated',`P20_Final_${Date.now()}.pptx`);
const result=await finalizePresentation({workspaceDir:base,candidatePath:candidate,finalPath,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:5,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],verifyArtifactToolImport:true,receiptPath:path.join(build,'deck-validation.json')});
await fs.copyFile(finalPath,path.join(base,'presentation/P20_Final.pptx'));
console.log(JSON.stringify(result));
console.log('Validated current deck updated. Run python scripts/sync_release.py to synchronize downloadable copies.');
