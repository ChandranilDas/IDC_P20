// Independent acceptance: the rendered evidence view must not invent scientific success.
import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,cleanup,within} from '@testing-library/react';
import {ValidationView} from '../src/views/ValidationView';
import evidence from '../public/generated/audit_evidence.json';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function serve(data:unknown){vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>data})));}
describe('Independent rendered scientific-evidence integrity',()=>{
 it('shows the actual archived replay values when evidence is present',async()=>{
  serve(evidence);render(<ValidationView/>);
  const row=await screen.findByRole('row',{name:/1D Random Quench/i});
  expect(row.textContent).toContain('1,000,000');
  expect(row.textContent).toContain('-19.3441');
 });
 it('does not report passing checks or invented results for an empty evidence response',async()=>{
  serve({});render(<ValidationView/>);
  await screen.findByText(/Numerical.*Physical Validation Evidence|Failed to Load Audit Evidence/i);
  expect(screen.queryByText(/All 6 Pillars Satisfied/i)).toBeNull();
  expect(screen.queryAllByText(/^Pass$/).length).toBe(0);
  expect(document.body.textContent).not.toContain('-23.8214');
  expect(document.body.textContent).not.toContain('0.9992');
 });
 it('marks real failed energy and derivative evidence as failed',async()=>{
  const data:any=structuredClone(evidence);
  data.independent_full_replay.tdgl_1d_random['energy_violations_above_1e-9']=2;
  data.independent_full_replay.tdgl_1d_random.passed=false;
  data.validation_summary.directional_derivative['1D_relative_mismatch']=0.01;
  data.validation_summary.directional_derivative['1D_passed']=false;
  serve(data);render(<ValidationView/>);
  const energy=await screen.findByRole('row',{name:/1\. Energy Monotonicity/i});
  expect(within(energy).queryByText(/^Pass$/)).toBeNull();
  expect(energy.textContent).toMatch(/fail|exceeded/i);
  const gradient=screen.getByRole('row',{name:/2\. Gradient.Flow Consistency/i});
  expect(within(gradient).queryByText(/^Pass$/)).toBeNull();
  expect(gradient.textContent).toMatch(/fail|exceeded/i);
 });
 it('keeps descriptive spectral fits separate from pass/fail validation claims',async()=>{
  serve(evidence);render(<ValidationView/>);
  await screen.findByRole('row',{name:/1D Random Quench/i});
  const row=screen.queryByRole('row',{name:/6\. Spectral Porod Tails/i});
  if(row)expect(within(row).queryByText(/^Pass$/)).toBeNull();
 });
 it('does not pass replay evidence when all three run objects lack required measurements',async()=>{
  const data:any=structuredClone(evidence);
  data.independent_full_replay={tdgl_1d_random:{},tdgl_2d_random:{},tdgl_1d_kink_antikink:{}};
  serve(data);render(<ValidationView/>);
  const row=await screen.findByRole('row',{name:/1\. Energy Monotonicity/i});
  expect(within(row).queryByText(/^Pass$/)).toBeNull();
  expect(row.textContent).toMatch(/unavailable|incomplete/i);
 });
 it('does not pass when required audit flags are absent',async()=>{
  const data:any=structuredClone(evidence);
  delete data.validation_summary.directional_derivative['1D_passed'];
  delete data.validation_summary.fourier_eigenmode_2d.passed;
  serve(data);render(<ValidationView/>);
  const gradient=await screen.findByRole('row',{name:/2\. Gradient.Flow Consistency/i});
  expect(within(gradient).queryByText(/^Pass$/)).toBeNull();
  const fourier=screen.getByRole('row',{name:/5\. 2D Fourier/i});
  expect(within(fourier).queryByText(/^Pass$/)).toBeNull();
 });
 it('shows retry rather than success on a failed evidence fetch',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503,statusText:'Unavailable'})));
  render(<ValidationView/>);expect(await screen.findByRole('button',{name:/retry/i})).toBeTruthy();
  expect(screen.queryAllByText(/^Pass$/).length).toBe(0);
 });
});
