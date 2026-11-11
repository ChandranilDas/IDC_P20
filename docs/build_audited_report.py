from pathlib import Path
import json
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,Image,PageBreak
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
root=Path(__file__).resolve().parents[1]
out=root/'docs';out.mkdir(exist_ok=True)
import matplotlib
font=Path(matplotlib.get_data_path())/'fonts/ttf/DejaVuSans.ttf'
pdfmetrics.registerFont(TTFont('DV',str(font)))
styles=getSampleStyleSheet()
for name in ['Normal','BodyText','Title','Heading1','Heading2']:styles[name].fontName='DV'
styles['BodyText'].fontSize=9.5;styles['BodyText'].leading=14;styles['BodyText'].spaceAfter=8
styles['Title'].fontSize=24;styles['Title'].leading=29
styles['Heading1'].fontSize=18;styles['Heading1'].leading=24;styles['Heading1'].textColor=colors.HexColor('#123654')
styles['Heading2'].fontSize=12;styles['Heading2'].leading=17
styles.add(ParagraphStyle('Eq',fontName='DV',fontSize=13,leading=21,spaceAfter=10,textColor=colors.HexColor('#126c79')))
styles.add(ParagraphStyle('SmallDV',fontName='DV',fontSize=8,leading=11,spaceAfter=6))
S=[]
M=[]
def p(t,style='BodyText'):
 S.append(Paragraph(t,styles[style]));M.append(('## ' if style in ['Heading1','Heading2'] else '# ' if style=='Title' else '')+t+'\n')
def fig(name,width=480):
 M.append(f'![{name}](../results/figures/{name})\n')
 path=root/'results/figures'/name
 im=PILImage.open(path);h=width*im.height/im.width
 return Image(str(path),width=width,height=h)
def table(rows,widths):
 M.append('\n'.join(['| '+' | '.join(map(str,row))+' |' for row in [rows[0],['---']*len(rows[0])]+rows[1:]])+'\n')
 cells=[[Paragraph(str(c),styles['SmallDV']) for c in row] for row in rows]
 t=Table(cells,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8f2f4')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),.6,colors.HexColor('#126c79')),('BOTTOMPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7)]));S.append(t);S.append(Spacer(1,8))
obs=json.loads((root/'audit/observed_run_summary.json').read_text());val=json.loads((root/'results/validation/validation_summary.json').read_text());replay=json.loads((root/'audit/independent_full_replay.json').read_text())
p('P20 | TDGL in 1D and 2D','Title')
p('Technical report • executed simulations and independent verification','Heading2')
p('Scope and sources','Heading1')
p('The allocation specifies numerical simulation of the 1D and 2D TDGL equation. The two supplied papers [1,2] define the real scalar, nonconserved Model-A problem. All fields here originate from specified initial conditions. No external dataset, superconducting order parameter or electromagnetic coupling is used.')
p('Model and variational formulation','Heading2')
p('∂φ/∂t = φ − φ³ + ∇²φ = −δF/δφ','Eq')
p('F[φ] = ∫ [−φ²/2 + φ⁴/4 + |∇φ|²/2] dr','Eq')
p('With periodic boundaries, integration by parts gives δF/δφ = −φ + φ³ − ∇²φ and dF/dt = −∫(∂φ/∂t)² dr ≤ 0. The uniform fixed points are 0 and ±1. A homogeneous perturbation grows near 0, whereas ±1 are linearly stable. The infinite-line kink is φ(x) = tanh[(x−x₀)/√2]. [1, Eq. 1; 2, Eqs. 2, 22–23]')
p('Discretization and parameters','Heading2')
p('Forward Euler advances φⁿ⁺¹ = φⁿ + Δt(φⁿ − (φⁿ)³ + Δₕφⁿ). The Laplacian uses nearest-neighbour central differences: the three-point stencil in 1D and five-point stencil in 2D. Circular indexing enforces periodicity. [2, Sec. III]')
table([['Run','Box / grid','Δx','Δt','Final t'],['1D random','100 / 1024','0.09765625','0.001','1000'],['2D random','128 / 128×128','1','0.01','100'],['1D wall pair','100 / 1024','0.09765625','0.001','800']],[95,135,95,75,80])
p('The random runs use NumPy default_rng seed 42 and independent uniform values in [−0.05,0.05]. Their ensemble mean is zero; individual sample means are not forced to zero. Table I of [2] supplies both main grid and time-step settings.')
p('The discrete energy uses forward edge differences, ½Σₐ[(φᵢ₊ₑₐ−φᵢ)/hₐ]², counted once per edge. Its negative gradient divided by cell volume equals the implemented RHS. This consistency matters when checking dissipation.')
S.append(PageBreak())
p('Executed dynamics','Heading1')
p('1D: domains persist through t = 1000','Heading2')
S.append(fig('fig2_1d_evolution_curves.png',480))
p(f"The random run ends with {obs['tdgl_1d_random']['final_periodic_sign_changes']} periodic sign changes and mean φ = {obs['tdgl_1d_random']['mean_final']:.6f}. The late curves nearly overlap: this realization retains long-lived walls. Complete uniform ordering is not observed during this run.")
p('2D: small domains disappear and larger regions remain','Heading2')
S.append(fig('fig6_2d_coarsening_panels.png',480))
p(f"The 128×128 run develops positive and negative regions and coarsens through t = 100. Its final mean is {obs['tdgl_2d_random']['mean_final']:.6f} and ⟨φ²⟩ = {obs['tdgl_2d_random']['mean_square_final']:.6f}. These are morphology observations, not a measured growth exponent.")
p('A separate periodic kink–antikink case starts at x₁=46.5 and x₂=53.5 (R₀=7). It reaches φ≈−1 by t=800. This shortened-separation demonstration is not a reproduction of the R₀=10, t=30000 experiment in [1, Sec. V A]. GIFs and space–time plots accompany the saved numerical fields.')
S.append(PageBreak())
p('Validation and numerical evidence','Heading1')
rows=[['Check','Result / interpretation'],['Uniform states','0 and ±1 remain fixed; a small homogeneous perturbation of 0 grows.'],['Kink residual',f"Interior RMS residual order p = {val['kink_convergence']['p_l2']:.4f}; max-norm order {val['kink_convergence']['p_linf']:.4f}."],['Time refinement','Exact homogeneous nonlinear solution: measured Euler order 0.99860 in both 1D and 2D.'],['Periodic stencil','Independent Fourier eigenmode errors below 4×10⁻¹⁴, including unequal 2D spacing.'],['Energy consistency','Independent finite-difference directional derivatives agree with −cell volume × RHS; relative errors below 10⁻⁸.']]
table(rows,[120,360])
p('A single tanh is not periodic. Its residual convergence is evaluated only in the fixed interior window x∈[12,48] of a length-60 interval. This demonstrates local second-order truncation accuracy, not a globally periodic stationary kink or full 2D solution convergence.')
S.append(Table([[fig('fig8_convergence.png',235),fig('fig7_free_energy_2d.png',235)]],colWidths=[240,240]))
p('Stability and energy','Heading2')
p('Linearization about ±1 gives Δt ≤ h²/(h²+2D) [2, Eq. 35]. The chosen steps use 21.07% (1D) and 5.00% (2D) of this bound. It is not unconditional nonlinear stability. A deliberate 1D overstep reaches the code’s blow-up threshold at step 12.')
rows=[['Run','F(0)','F(final)','Every-step check']]
for k,label in [('tdgl_1d_random','1D random'),('tdgl_2d_random','2D random'),('tdgl_1d_kink_antikink','1D pair')]:
 a=obs[k];rows.append([label,f"{a['F_initial_corrected']:.6f}",f"{a['F_final_corrected']:.6f}",'0 violations >10⁻⁹'])
table(rows,[115,105,110,150])
p('An independent implementation replayed 1,810,000 integration steps across these three experiments. Every step passed the energy check; all saved fields agreed within 2.5×10⁻¹². Roundoff-sized positive differences are allowed near the uniform equilibrium.','SmallDV')
S.append(PageBreak())
p('Interpretation, limits and reproduction','Heading1')
p('Optional spectra','Heading2')
p('The FFT convention is φ̂ = FFT(φ)/number of grid points, so Σₖ|φ̂|²/2 = ⟨φ²⟩/2. This quadratic spectral quantity differs from the decreasing GL free energy F. The 1D output folds ±k; 2D outputs distinguish mean modal energy in a shell from the shell sum. Parseval checks cover even/odd 1D grids and 2D mode accounting.')
p('The papers discuss Porod tails k⁻² in 1D and k⁻³ for angle-averaged modal energy in 2D. A 2D shell sum instead gains a geometric factor. Hardening φ to sign(φ), as in [2, Sec. V B], sharpens interfaces for a separate diagnostic. Fits are descriptive checks on one realization and selected intervals; regression standard errors do not capture seed, discretization or fit-window uncertainty. The core solver validation does not rely on these fits.')
p('Limits of this project','Heading2')
p('The reference 2D mesh h=1 is coarse relative to the tanh scale √2. Matching the reference setup does not establish continuum accuracy at this resolution. Finite periodic boxes and finite run times constrain coarsening. No ensemble growth law, universal exponent or exact reproduction of the papers’ random realizations is claimed. The wall-pair separation was deliberately changed for a practical annihilation demonstration.')
p('Reproduction and provenance','Heading2')
p('Run commands from the IDC_P20 project root after installing requirements in a virtual environment. The package includes source code, the original three source files, saved arrays/CSV tables, figures, animations and independent audit scripts.')
for command in ['python -m pytest -q','python experiments/run_all.py','python audit/replay_runs.py','python audit/temporal_convergence.py','python audit/check_implementation.py audit/implementation_checks.json']:
 p(command,'SmallDV')
p('The main output files are results/raw/tdgl_1d_random.npz, tdgl_2d_random.npz and tdgl_1d_kink_antikink.npz. Validation tables are in results/validation/. Independent checks and execution evidence are in audit/. The README lists presentation and figure regeneration commands.')
p('Audit corrections','Heading2')
p('Independent review identified and corrected inconsistent discrete-energy gradients, Fourier mode accounting, a distorted time axis for uneven snapshots, and animation frames sharing a mutable rendering buffer. Draft report claims were checked against numerical artifacts. A passing test suite alone was not treated as evidence that figures or scientific claims were correct.')
p('References','Heading2')
p('[1] M. K. Verma, R. Agrawal, P. K. Yadav and S. Puri, “Nonlinear energy dissipation and transfers in coarsening systems,” Physical Review E 107, 034207 (2023). DOI: 10.1103/PhysRevE.107.034207. Supplied PDF.','SmallDV')
p('[2] P. K. Yadav, M. K. Verma and S. Puri, “Spectral energy transfers in domain growth problems,” Physical Review E 110, 044130 (2024). DOI: 10.1103/PhysRevE.110.044130. Supplied PDF.','SmallDV')
def footer(c,doc):
 c.setFont('DV',8);c.setFillColor(colors.HexColor('#617080'));c.drawString(40,25,'P20 • Model-A TDGL • independently checked numerical results');c.drawRightString(555,25,str(doc.page))
doc=SimpleDocTemplate(str(out/'P20_Technical_Report.pdf'),pagesize=(595.28,841.89),leftMargin=50,rightMargin=50,topMargin=38,bottomMargin=43)
doc.build(S,onFirstPage=footer,onLaterPages=footer)
(out/'P20_Technical_Report.md').write_text('\n'.join(M))
print(out/'P20_Technical_Report.pdf')
