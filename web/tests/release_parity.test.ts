import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateInitialCondition, eulerStep1D, eulerStep2D, computeDiagnostics, type SimulationConfig } from '../src/core/tdgl';
const manifest=JSON.parse(readFileSync('public/generated/manifest.json','utf8'));
const reference=JSON.parse(readFileSync('public/generated/reference_results.json','utf8'));
function frame(run:any,index:number){
 const bytes=readFileSync('public/'+run.binary_file);const count=run.shape.slice(1).reduce((a:number,b:number)=>a*b,1);
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const field=new Float64Array(count);
 for(let i=0;i<count;i++)field[i]=view.getFloat64(8*(index*count+i),true);
 return field;
}
function maxDiff(a:Float64Array,b:Float64Array){let e=0;for(let i=0;i<a.length;i++)e=Math.max(e,Math.abs(a[i]-b[i]));return e;}
describe('Release: actual archives, live initialization and complete live default trajectories',()=>{
 for(const [name,end] of [['tdgl_1d_random',40],['tdgl_2d_random',25]] as const){
  it(name+' live run matches its archived initial field and trajectory at the same time',()=>{
   const run=manifest.runs[name];const dim=run.dimension as 1|2;const N=run.N??run.Nx;
   const cfg:SimulationConfig={dimension:dim,L:run.L,N,Nx:N,Ny:run.Ny??N,dx:run.dx,dy:run.dy??run.dx,dt:run.dt,duration:end,seed:42,noiseAmplitude:.05,phi0:0,preset:'random'};
   let field:Float64Array=generateInitialCondition(cfg);expect(maxDiff(field,frame(run,0))).toBe(0);
   const source=readFileSync('../'+run.source_npz);expect(createHash('sha256').update(source).digest('hex')).toBe(run.source_sha256);
   let next:Float64Array=new Float64Array(field.length);const scratch=new Float64Array(field.length);
   for(let step=0;step<Math.round(end/cfg.dt);step++){
    if(dim===1)eulerStep1D(field,cfg.dx,cfg.dt,scratch,next);else eulerStep2D(field,cfg.Nx,cfg.Ny,cfg.dx,cfg.dt,cfg.dy,scratch,next);
    [field,next]=[next,field];
   }
   const target=run.t_snapshots.indexOf(end);expect(target).toBeGreaterThan(0);
   const error=maxDiff(field,frame(run,target));expect(error).toBeLessThan(1e-10);
   const diag=computeDiagnostics(field,cfg.dx,dim,cfg.Nx,cfg.Ny,end,Math.round(end/cfg.dt),cfg.dy);const index=run.diag_times.indexOf(end);
   expect(Math.abs(diag.freeEnergy-run.diagnostics.free_energy[index])).toBeLessThan(1e-8);
   const final=frame(run,run.num_snapshots-1);const observed=computeDiagnostics(final,cfg.dx,dim,cfg.Nx,cfg.Ny,reference.runs[name].t_final,reference.runs[name].steps,cfg.dy);
   expect(Math.abs(observed.freeEnergy-reference.runs[name].free_energy)).toBeLessThan(1e-8);
  },20000);
 }
});
