import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const runtimeRequire=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
const {Presentation,PresentationFile}=await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
import {fileURLToPath,pathToFileURL} from 'node:url';
const skill=process.env.CODEX_PRESENTATION_SKILL_DIR;
if(!skill)throw new Error('Set CODEX_PRESENTATION_SKILL_DIR to the installed Presentations skill directory.');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const P=Presentation.create({slideSize:{width:1280,height:720}});
const C={bg:'#10293C',ink:'#F6F8FA',muted:'#B8CBD8',accent:'#76D5D6',orange:'#FFAA83'};
function txt(s,t,x,y,w,h,size=24,color=C.ink,bold=false){const q=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});q.text=t;q.text.style={typeface:'DejaVu Sans',fontSize:size,color,bold};return q;}
function rect(s,x,y,w,h,color){return s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill:color,line:{fill:'none',width:0}});}
function slide(n,title){const s=P.slides.add();s.background.fill=C.bg;txt(s,title,55,38,1170,70,36,C.ink,true);rect(s,55,119,70,4,C.accent);txt(s,'P20  /  Model-A TDGL',55,675,900,25,15,C.muted);txt(s,String(n).padStart(2,'0'),1175,675,60,25,15,C.muted);return s;}
async function img(s,name,x,y,w,h){const b=await fs.readFile(path.join(base,'presentation/assets',name));s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:name,position:{left:x,top:y,width:w,height:h},fit:'contain'});}
const refs='Sources: Verma et al., Physical Review E 107, 034207 (2023), supplied PDF; Yadav, Verma & Puri, Physical Review E 110, 044130 (2024), supplied PDF. Numerical data: IDC_P20/results/raw. Independent evidence: IDC_P20/audit.';
let s=slide(1,'Simulating 1D & 2D TDGL');
txt(s,'∂φ/∂t = φ − φ³ + ∇²φ',75,150,1120,80,54,C.accent,true);
txt(s,'Real scalar field     Nonconserved dynamics     Periodic boundaries',78,247,1120,42,23,C.muted);
await img(s,'foundation.png',75,316,1130,300);
s.speakerNotes.text=refs+' The allocation asks for numerical simulation. The dimensionless Model A follows from the GL free energy. The uniform state zero is unstable to homogeneous perturbations and ±1 are stable. The single tanh is an infinite-line solution, used only for an interior residual test.';
s=slide(2,'Finite differences in a periodic box');
txt(s,'φⁿ⁺¹ = φⁿ + Δt [φⁿ − (φⁿ)³ + Δₕφⁿ]',62,151,1150,70,35,C.accent);
// Editable five-point stencil.
for (const [x,y,w,h] of [[195,395,200,3],[293,298,3,200]])rect(s,x,y,w,h,'#5C7E92');
for (const [x,y,v] of [[255,358,'−4'],[255,260,'1'],[255,456,'1'],[157,358,'1'],[353,358,'1']]){s.shapes.add({geometry:'ellipse',position:{left:x,top:y,width:80,height:80},fill:v==='−4'?C.accent:'#244A60',line:{fill:'none',width:0}});txt(s,v,x+19,y+17,65,50,30,v==='−4'?C.bg:C.ink,true);}
txt(s,'2D stencil / Δx²',164,559,400,45,24,C.muted);
txt(s,'1D   L = 100     N = 1024',580,267,630,45,27,C.ink,true);
txt(s,'Δx = 0.09765625     Δt = 0.001',580,320,630,45,23,C.muted);
txt(s,'2D   L = 128     N = 128 × 128',580,394,630,45,27,C.ink,true);
txt(s,'Δx = 1     Δt = 0.01',580,447,630,45,23,C.muted);
txt(s,'Δt ≤ Δx² / (Δx² + 2D)',580,533,630,45,29,C.orange);
txt(s,'Linear bound around φ = ±1',580,579,630,35,19,C.muted);
s.speakerNotes.text=refs+' Parameters and linear stability bound: Yadav et al. (2024), Table I, Sec. III and Eq. 35. Euler is first-order in time; central spatial differences are second-order. Discrete energy uses forward edge differences to match the stencil. The chosen dt/bound ratios are 0.2107152 and 0.05. The criterion is not unconditional nonlinear stability.';
s=slide(3,'1D: domains form and walls persist');
await img(s,'one_d.png',55,165,1170,380);
txt(s,'Random quench: 6 walls at t = 1000',70,566,710,44,25,C.accent,true);
txt(s,'Separate pair: R₀ = 7, uniform by t = 800',70,611,1120,35,22,C.muted);
s.speakerNotes.text=refs+' Random seed 42, noise uniform in [-0.05,0.05]. The random run has six periodic sign changes at t=1000; full ordering is not observed. The separate kink-antikink demonstration uses x1=46.5,x2=53.5, a shorter separation than the 2023 paper R0=10. It reaches the uniform -1 state. Actual time coordinates are used in the space-time image.';
s=slide(4,'2D: small domains disappear');
await img(s,'two_d.png',55,160,1170,402);
txt(s,'128 × 128 grid     Seed 42     t = 0 to 100',65,591,1140,42,27,C.accent,true);
txt(s,'Coarsening morphology; no growth exponent fitted',65,634,1140,31,20,C.muted);
s.speakerNotes.text=refs+' Reference settings match Yadav et al. (2024), Table I. The final mean is -0.187712 and mean square is 0.906062. The dx=1 grid is coarse relative to the sqrt(2) tanh scale; no continuum accuracy or ensemble growth law is claimed. These are actual saved simulation fields.';
s=slide(5,'Validation of the executed runs');
await img(s,'validation.png',55,157,1170,345);
const stats=[['1.9895','spatial order'],['0.9986','time order'],['1.81 million','steps checked']];
for(let i=0;i<3;i++){let x=65+i*390;txt(s,stats[i][0],x,526,365,54,38,C.accent,true);txt(s,stats[i][1],x,582,365,35,21,C.muted);}
txt(s,'Fixed points, periodic modes and energy consistency pass',65,628,1150,35,23,C.ink);
s.speakerNotes.text=refs+' Spatial order is the interior RMS residual of a single tanh, not a periodic kink equilibrium. Independent exact homogeneous nonlinear-solution temporal check yields p=0.9986015 in both dimensions. Independent full replay covers 1,000,000 random 1D + 10,000 random 2D + 800,000 pair steps; zero energy violations above 1e-9 and snapshot discrepancy below 2.5e-12. F/volume curves use compatible forward-edge discrete energy. The project unit test suite currently has 13 passing tests. Optional spectra are in the report/package with caveats.';
await fs.mkdir(path.join(base,'presentation/preview'),{recursive:true});
for(let i=0;i<P.slides.items.length;i++){const png=await P.export({slide:P.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(base,`presentation/preview/slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()));}
await fs.mkdir(path.join(base,'presentation/build'),{recursive:true});
await fs.mkdir(path.join(base,'presentation/regenerated'),{recursive:true});
const regeneratedName='P20_Progress_'+Date.now()+'.pptx';
const candidate=path.join(base,'presentation/build/P20_progress_candidate.pptx');await (await PresentationFile.exportPptx(P)).save(candidate);

const r=await finalizePresentation({workspaceDir:base,candidatePath:candidate,finalPath:path.join(base,'presentation/regenerated',regeneratedName),pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:5,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['DejaVu Sans']},verifyArtifactToolImport:true,receiptPath:path.join(base,'audit/presentation_regeneration_validation.json')});console.log(r);
