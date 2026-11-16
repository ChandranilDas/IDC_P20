import {useMemo,useState} from 'react';
import {rhs1D} from '../core/tdgl';

export function kinkBenchmark(N:number,L=60){
 const dx=L/N;
 const field=Float64Array.from({length:N},(_,i)=>Math.tanh((i*dx-L/2)/Math.SQRT2));
 const residual=rhs1D(field,dx);
 const interior=Array.from({length:N},(_,i)=>i).filter(i=>i*dx>=.2*L&&i*dx<=.8*L);
 const l2=Math.sqrt(interior.reduce((a,i)=>a+residual[i]**2,0)/interior.length);
 const max=Math.max(...interior.map(i=>Math.abs(residual[i])));
 return {dx,l2,max,profile:interior.filter(i=>Math.abs(i*dx-L/2)<=6).map(i=>({x:i*dx-L/2,phi:field[i],residual:residual[i]}))};
}
export function kinkConvergence(){
 const rows=[128,256,512,1024,2048].map(N=>({N,...kinkBenchmark(N)}));
 const xs=rows.map(r=>Math.log(r.dx)),ys=rows.map(r=>Math.log(r.l2));
 const mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;
 const order=xs.reduce((sum,x,i)=>sum+(x-mx)*(ys[i]-my),0)/xs.reduce((sum,x)=>sum+(x-mx)**2,0);
 return {rows,order};
}
function Curve({title,xLabel,yLabel,x,y,color,log=false}: {title:string;xLabel:string;yLabel:string;x:number[];y:number[];color:string;log?:boolean}){
 const xx=log?x.map(Math.log10):x, yy=log?y.map(Math.log10):y;
 const xmin=Math.min(...xx),xmax=Math.max(...xx),ymin=Math.min(...yy),ymax=Math.max(...yy);
 const px=(v:number)=>64+(v-xmin)/(xmax-xmin||1)*400;
 const py=(v:number)=>200-(v-ymin)/(ymax-ymin||1)*160;
 const fmt=(v:number)=>Math.abs(v)<.001&&v!==0?v.toExponential(1):Number(v.toPrecision(3)).toString();
 return <figure style={{margin:0,minWidth:0}}><figcaption style={{fontWeight:600,fontSize:'.8rem'}}>{title}</figcaption>
 <svg role="img" aria-label={title} viewBox="0 0 500 252" style={{width:'100%',background:'#fff',color:'#20241f'}}>
 {[0,.5,1].map(t=>{const u=xmin+t*(xmax-xmin),v=ymin+t*(ymax-ymin);return <g key={t} fontSize="11" fill="#545a50"><line x1="64" x2="464" y1={py(v)} y2={py(v)} stroke="#ebebe4"/><text x={px(u)} y="219" textAnchor="middle">{fmt(log?10**u:u)}</text><text x="56" y={py(v)+4} textAnchor="end">{fmt(log?10**v:v)}</text></g>;})}
 <path d="M64 40V200H464" stroke="#545a50" fill="none"/>
 <polyline data-testid="benchmark-curve" points={xx.map((v,i)=>`${px(v)},${py(yy[i])}`).join(' ')} stroke={color} strokeWidth="2" fill="none"/>
 <text x="264" y="243" fontSize="12" textAnchor="middle">{xLabel}</text><text transform="translate(15 120) rotate(-90)" textAnchor="middle" fontSize="12">{yLabel}</text>
 </svg></figure>;
}
export function ValidationFigures(){
 const [N,setN]=useState(1024);
 const selected=useMemo(()=>kinkBenchmark(N),[N]);
 const convergence=useMemo(kinkConvergence,[]);
 return <section className="notebook-panel" aria-label="Kink benchmark figures" style={{marginTop:'1rem'}}>
 <div className="notebook-panel-header"><div className="notebook-panel-title">Kink profile and spatial convergence</div>
 <label style={{fontSize:'.75rem'}}>Benchmark grid N <select aria-label="Benchmark grid N" value={N} onChange={e=>setN(Number(e.target.value))}>{[128,256,512,1024,2048].map(n=><option key={n}>{n}</option>)}</select></label></div>
 <p style={{fontSize:'.78rem',color:'var(--ink-secondary)'}}>Analytical tanh wall on L = 60; residual evaluated only on 0.2L ≤ x ≤ 0.8L. This is an interior stencil benchmark, not a periodic single-wall simulation.</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'1rem'}}>
 <Curve title="Analytical wall" xLabel="x − x₀" yLabel="φK" x={selected.profile.map(p=>p.x)} y={selected.profile.map(p=>p.phi)} color="#b83a24"/>
 <Curve title="Discrete residual" xLabel="x − x₀" yLabel="φ − φ³ + Δhφ" x={selected.profile.map(p=>p.x)} y={selected.profile.map(p=>p.residual)} color="#204b6e"/>
 <Curve title="Spatial convergence" xLabel="Grid spacing h (log scale)" yLabel="Interior RMS residual (log scale)" x={convergence.rows.map(r=>r.dx)} y={convergence.rows.map(r=>r.l2)} color="#204b6e" log/>
 </div><p style={{fontSize:'.78rem'}}>RMS residual = {selected.l2.toExponential(4)} · fitted spatial order p = {convergence.order.toFixed(4)}</p>
 </section>;
}
