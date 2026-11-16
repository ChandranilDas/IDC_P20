import {it,expect,afterEach,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {SavedResearchPlots} from '../src/components/SavedResearchPlots';
import manifest from '../public/generated/manifest.json';
import reference from '../public/generated/reference_results.json';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
for(const id of ['tdgl_1d_random','tdgl_2d_random'] as const)it(`plots full recorded ${id} fields with the reference normalization`,()=>{
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
 const run=manifest.runs[id];const raw=readFileSync('public/'+run.binary_file);
 const buffer=new Float64Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 render(<SavedResearchPlots run={run as any} buffer={buffer}/>);
 const metrics=reference.runs[id];
 const f=screen.getByRole('img',{name:'Free Energy Density F / V'}).parentElement!;
 const q=screen.getByRole('img',{name:'Ordering Measure Q = ⟨φ²⟩ / 2'}).parentElement!;
 expect(f.textContent).toContain(metrics.energy_density.toFixed(6));
 expect(q.textContent).toContain(metrics.mean_square_half.toFixed(6));
 expect(screen.getByLabelText('Full recorded trajectory figures').textContent).toContain(`0–${metrics.t_final}`);
});
