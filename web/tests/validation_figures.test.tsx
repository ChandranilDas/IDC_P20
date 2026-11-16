import {it,expect,afterEach} from 'vitest';
import {render,fireEvent,screen,cleanup} from '@testing-library/react';
import {kinkBenchmark,kinkConvergence,ValidationFigures} from '../src/components/ValidationFigures';
import evidence from '../public/generated/audit_evidence.json';
afterEach(cleanup);
it('recomputes the benchmark norms and fitted order from the actual stencil',()=>{
 const c=kinkConvergence();const expected=evidence.validation_summary.kink_convergence;
 c.rows.forEach((r,i)=>{expect(Math.abs(r.l2-expected.l2_errors[i])).toBeLessThan(1e-12);expect(Math.abs(r.max-expected.linf_errors[i])).toBeLessThan(1e-12);});
 expect(c.order).toBeCloseTo(expected.p_l2,8);
 expect(kinkBenchmark(2048).l2).toBeLessThan(kinkBenchmark(1024).l2/3.9);
});
it('changes the plotted residual when the benchmark grid changes',()=>{
 render(<ValidationFigures/>);const old=screen.getAllByTestId('benchmark-curve')[1].getAttribute('points');
 fireEvent.change(screen.getByLabelText('Benchmark grid N'),{target:{value:'128'}});
 expect(screen.getAllByTestId('benchmark-curve')[1].getAttribute('points')).not.toBe(old);
 expect(screen.getByLabelText('Kink benchmark figures').textContent).toContain(kinkBenchmark(128).l2.toExponential(4));
});
