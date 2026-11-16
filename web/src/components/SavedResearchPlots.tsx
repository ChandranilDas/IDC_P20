import {useMemo} from 'react';
import {computeDiagnostics,type SimulationConfig} from '../core/tdgl';
import {ResearchPlots} from './ResearchPlots';
interface SavedRun {dimension:1|2;L:number;Nx?:number;Ny?:number;N?:number;dx:number;dy?:number;dt:number;t_snapshots:number[];id:string;}
export function SavedResearchPlots({run,buffer}:{run:SavedRun;buffer:Float64Array}){
 const data=useMemo(()=>{
  const Nx=run.Nx??run.N??1,Ny=run.dimension===1?1:run.Ny??Nx;
  const size=Nx*Ny;
  const config:SimulationConfig={dimension:run.dimension,L:run.L,N:Nx,Nx,Ny,dx:run.dx,dy:run.dy,dt:run.dt,duration:run.t_snapshots.at(-1)??0,seed:42,noiseAmplitude:0,phi0:0,preset:run.id.includes('kink')?'kink_pair':'random'};
  const snapshots=run.t_snapshots.map((time,index)=>{
   const field=buffer.subarray(index*size,(index+1)*size);
   return {time,step:Math.round(time/run.dt),field,diagnostics:computeDiagnostics(field,run.dx,run.dimension,Nx,Ny,time,Math.round(time/run.dt),run.dy)};
  });
  return {config,snapshots};
 },[run,buffer]);
 return <section id="saved-evolution-figures" aria-label="Full recorded trajectory figures" style={{scrollMarginTop:"5rem"}}><p style={{fontSize:'.8rem',color:'var(--ink-secondary)'}}>Full recorded trajectory: t = 0–{data.config.duration}. The field inspector above follows the selected frame.</p><ResearchPlots {...data}/></section>;
}
