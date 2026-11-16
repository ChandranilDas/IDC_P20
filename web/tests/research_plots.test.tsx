import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {ResearchPlots,timeColor,type ResearchSnapshot} from '../src/components/ResearchPlots';
import {computeDiagnostics,type SimulationConfig} from '../src/core/tdgl';
import colors from './plot_color_reference.json';
let rasters:{width:number;height:number;data:Uint8ClampedArray}[]=[];
beforeEach(()=>{rasters=[];vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation((()=>({createImageData:(width:number,height:number)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),putImageData:(data:any)=>rasters.push(data)})) as any);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const config=(dimension:1|2=1):SimulationConfig=>({dimension,L:3,N:3,Nx:3,Ny:3,dx:1,dt:.01,duration:10,seed:42,noiseAmplitude:0,phi0:.5,preset:'biased'});
const snap=(c:SimulationConfig,time:number,values:number[]):ResearchSnapshot=>{const field=new Float64Array(values);const step=Math.round(time/c.dt);return {time,step,field,diagnostics:computeDiagnostics(field,c.dx,c.dimension,c.Nx,c.Ny,time,step,c.dy)};};
it('uses exactly the notebook time colours',()=>{Object.entries(colors).forEach(([t,c])=>expect(timeColor(Number(t))).toBe(`rgb(${c.join(', ')})`));});
for(const dim of [1,2] as const)it(`normalizes real ${dim}D energy by volume and second moment by two, not variance`,()=>{
 const c=config(dim),field=Array(dim===1?3:9).fill(.5),s=[snap(c,0,field),snap(c,10,field)];
 render(<ResearchPlots config={c} snapshots={s}/>);
 const q=screen.getByRole('img',{name:'Ordering Measure Q = ⟨φ²⟩ / 2'}).parentElement!;
 const f=screen.getByRole('img',{name:'Free Energy Density F / V'}).parentElement!;
 expect(q.textContent).toContain('0.125000');expect(f.textContent).toContain('-0.109375');
 expect(q.innerHTML).not.toMatch(/NaN|Infinity/);
});
it('places nonuniform timestamps at their actual horizontal coordinates',()=>{
 const c=config(),s=[snap(c,0,[0,0,0]),snap(c,.1,[.5,.5,.5]),snap(c,10,[1,1,1])];render(<ResearchPlots config={c} snapshots={s}/>);
 const chart=screen.getByRole('img',{name:'Ordering Measure Q = ⟨φ²⟩ / 2'});
 const points=chart.querySelector('polyline')!.getAttribute('points')!.split(' ').map(s=>s.split(',').map(Number));
 expect((points[1][0]-points[0][0])/(points[2][0]-points[0][0])).toBeCloseTo(.01,3);
});
it('uses actual 2D coordinates and a shared field colour scale',()=>{
 const c=config(2);const s=snap(c,0,[-1,0,1, -1,0,1, -1,0,1]);render(<ResearchPlots config={c} snapshots={[s]}/>);
 const img=rasters.at(-1)!;expect(img.width).toBe(3);expect(img.height).toBe(3);
 expect(Array.from(img.data.slice(0,3))).toEqual([184,58,36]);
 expect(Array.from(img.data.slice(6*4,6*4+3))).toEqual([43,92,143]);
});
it('maps heatmap rows by recorded time instead of equal-height frame bands',()=>{
 const c=config(),s=[snap(c,0,[-1,-1,-1]),snap(c,.1,[1,1,1]),snap(c,10,[-1,-1,-1])];render(<ResearchPlots config={c} snapshots={s}/>);
 const img=rasters.at(-1)!;const row=Math.round((1-1/10)*(img.height-1));
 expect(Array.from(img.data.slice(row*img.width*4,row*img.width*4+3))).toEqual([184,58,36]);
});
it('supports a single initial field without inventing an evolved curve',()=>{
 const c=config();render(<ResearchPlots config={c} snapshots={[snap(c,0,[.1,.1,.1])]}/>);
 expect(screen.getByLabelText('Evolution figures').innerHTML).not.toMatch(/NaN|Infinity/);
 expect(screen.getByRole('img',{name:'Free Energy Density F / V'}).querySelector('polyline')).toBeNull();
});
