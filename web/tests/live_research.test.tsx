import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act,cleanup,within} from '@testing-library/react';
import {SimulationLab} from '../src/views/SimulationLab';
import {computeDiagnostics} from '../src/core/tdgl';
vi.mock('../src/components/FieldCanvas',()=>({FieldCanvas:()=> <canvas/>}));
class HostWorker {static instance:HostWorker;sent:any[]=[];onmessage:any;constructor(){HostWorker.instance=this;}postMessage(m:any){this.sent.push(m);}terminate(){}emit(type:string,field:Float64Array,time:number,isSnapshot=true){const m=this.sent.filter(m=>m.type==='INIT').at(-1),c=m.config;this.onmessage({data:{type,runId:m.runId,field,diagnostics:computeDiagnostics(field,c.dx,c.dimension,c.Nx,c.Ny,time,Math.round(time/c.dt)),isSnapshot}});}}
beforeEach(()=>{vi.stubGlobal('Worker',HostWorker);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('uses the latest real live field even between stored snapshots, then clears on reset',async()=>{
 render(<SimulationLab/>);const w=HostWorker.instance;const c=w.sent.filter(m=>m.type==='INIT').at(-1).config;
 await act(async()=>w.emit('INITIALIZED',new Float64Array(c.N).fill(0),0));
 fireEvent.click(screen.getByRole('button',{name:'Start'}));
 await act(async()=>w.emit('TICK',new Float64Array(c.N).fill(.5),.25,false));
 const panel=screen.getByLabelText('Evolution figures');
 expect(within(panel).getByRole('img',{name:'Ordering Measure Q = ⟨φ²⟩ / 2'}).parentElement!.textContent).toContain('0.125000');
 fireEvent.click(screen.getByRole('button',{name:'Reset Simulation'}));
 expect(screen.queryByLabelText('Evolution figures')).toBeNull();
});
it('rewinding excludes later times from the live trajectory figures',async()=>{
 render(<SimulationLab/>);const w=HostWorker.instance;const c=w.sent.filter(m=>m.type==='INIT').at(-1).config;
 await act(async()=>w.emit('INITIALIZED',new Float64Array(c.N).fill(0),0));
 await act(async()=>w.emit('TICK',new Float64Array(c.N).fill(.5),1));
 await act(async()=>w.emit('COMPLETED',new Float64Array(c.N).fill(1),2));
 expect(screen.getByLabelText('Evolution figures').textContent).toContain('0.500000');
 fireEvent.click(screen.getByRole('button',{name:'First Snapshot'}));
 const panel=screen.getByLabelText('Evolution figures');expect(panel.textContent).not.toContain('0.500000');
 expect(within(panel).getByRole('img',{name:'Ordering Measure Q = ⟨φ²⟩ / 2'}).parentElement!.textContent).toContain('0.000000');
});
