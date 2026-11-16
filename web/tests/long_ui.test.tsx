import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import {SimulationLab} from '../src/views/SimulationLab';
import {computeDiagnostics} from '../src/core/tdgl';
vi.mock('../src/components/FieldCanvas',()=>({FieldCanvas:()=> <canvas id="tdgl-field-canvas"/>}));
class TestWorker {
 static instances:TestWorker[]=[];onmessage:any;onerror:any;sent:any[]=[];
 constructor(){TestWorker.instances.push(this);}postMessage(m:any){this.sent.push(m);}terminate(){}
 init(){return this.sent.filter(m=>m.type==='INIT').at(-1);}
 emit(m:any){this.onmessage?.({data:m});}
 initialized(){const m=this.init(),c=m.config;const field=new Float64Array(c.dimension===1?c.Nx:c.Nx*c.Ny).fill(.1);this.emit({type:'INITIALIZED',runId:m.runId,field,diagnostics:computeDiagnostics(field,c.dx,c.dimension,c.Nx,c.Ny,0,0)});return {m,field};}
}
beforeEach(()=>{TestWorker.instances=[];vi.stubGlobal('Worker',TestWorker);});afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('Actual long-run controls and recovery',()=>{
 it('accepts long live duration and surfaces a worker failure without automatically restarting',async()=>{
  render(<SimulationLab/>);const w=TestWorker.instances.at(-1)!;await act(async()=>w.initialized());
  fireEvent.change(screen.getByLabelText(/Duration/),{target:{value:'1000'}});await act(async()=>w.initialized());
  const start=screen.getByRole('button',{name:'Start'});expect(start.hasAttribute('disabled')).toBe(false);fireEvent.click(start);
  const initCount=w.sent.filter(m=>m.type==='INIT').length;
  await act(async()=>w.emit({type:'ERROR',runId:w.init().runId,message:'Allocation failed in test'}));
  expect(document.body.textContent).toContain('Allocation failed in test');
  expect(document.body.textContent).not.toContain('Reached final simulation frame');
  expect(w.sent.filter(m=>m.type==='INIT')).toHaveLength(initCount);
  fireEvent.click(screen.getByRole('button',{name:'Reset Simulation'}));
  expect(w.sent.filter(m=>m.type==='INIT').length).toBeGreaterThan(initCount);
 });
 it('defers large allocations until Start is explicitly pressed',async()=>{
  render(<SimulationLab/>);const w=TestWorker.instances.at(-1)!;await act(async()=>w.initialized());
  fireEvent.change(screen.getByLabelText('Preset:'),{target:{value:'2d_random'}});
  fireEvent.change(screen.getByLabelText('System Size L'),{target:{value:'8192'}});
  fireEvent.change(screen.getByLabelText('Grid Points N (int)'),{target:{value:'8192'}});
  expect(w.sent.some(m=>m.type==='INIT'&&m.config.N===8192)).toBe(false);
  const start=screen.getByRole('button',{name:'Start'});expect(start.hasAttribute('disabled')).toBe(false);
  fireEvent.click(start);expect(w.init().config.N).toBe(8192);
 });
 it('retains the first and latest field under adaptive snapshot thinning',async()=>{
  render(<SimulationLab/>);const w=TestWorker.instances.at(-1)!;await act(async()=>w.initialized());
  fireEvent.change(screen.getByLabelText('Preset:'),{target:{value:'2d_random'}});
  fireEvent.change(screen.getByLabelText('Grid Points N (int)'),{target:{value:'500'}});
  fireEvent.change(screen.getByLabelText('Time Step Δt'),{target:{value:'.001'}});
  let a:any;await act(async()=>{a=w.initialized();});
  fireEvent.click(screen.getByRole('button',{name:'Start'}));
  for(let i=1;i<=34;i++)await act(async()=>w.emit({type:'TICK',runId:a.m.runId,field:a.field,isSnapshot:true,diagnostics:{time:i/10,step:i*100,freeEnergy:-i,meanPhi:.1,meanPhi2:.01,minPhi:.1,maxPhi:.1}}));
  const slider=screen.getByRole('slider') as HTMLInputElement;
  expect(Number(slider.max)).toBeLessThan(33);
  expect(document.body.textContent).toContain('3.400');
  fireEvent.click(screen.getByRole('button',{name:'First Snapshot'}));
  expect(document.body.textContent).toContain('0.000');
 });
});
