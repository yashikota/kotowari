import { describe, expect, it } from 'vite-plus/test';
import {
  initiativeDraft,
  initiativePatch,
  reconcileInitiativeDraft,
  sameInitiativeDraft,
} from './initiativeDraft.ts';
import type { Initiative } from '../types.ts';

const entity: Initiative = {
  id: 1,
  name: 'Objective',
  slug: 'objective',
  description: 'Purpose',
  status: 'planned',
  projectSlugs: ['one', 'two'],
  labels: ['a', 'b'],
  createdAt: '2026-10-08',
  updatedAt: '2026-10-08',
};
describe('initiative editing snapshots', () => {
  it('normalizes optional fields and treats membership ordering as unchanged', () => {
    const baseline = initiativeDraft(entity);
    expect(baseline).toMatchObject({
      owner: '',
      color: 'purple',
      priority: 0,
      startDate: '',
      targetDate: '',
    });
    expect(
      sameInitiativeDraft(baseline, {
        ...baseline,
        projectSlugs: ['two', 'one'],
        labels: ['b', 'a'],
      }),
    ).toBe(true);
    expect(initiativePatch(baseline, baseline)).toEqual({});
  });
  it('patches only edited fields and explicitly clears dates', () => {
    const baseline = initiativeDraft({
      ...entity,
      startDate: '2026-10-08',
      targetDate: '2026-11-08',
    });
    expect(
      initiativePatch(
        { ...baseline, name: ' Revised ', startDate: '', targetDate: '', priority: 2 },
        baseline,
      ),
    ).toEqual({ name: 'Revised', priority: 2, clearStartDate: true, clearTargetDate: true });
  });
  it('refreshes pristine fields and retains independently edited fields', () => {
    const baseline = initiativeDraft(entity);
    const draft = {
      ...baseline,
      description: 'Unsaved purpose',
      labels: ['new'],
      targetDate: '2026-12-01',
    };
    const incoming = {
      ...baseline,
      name: 'Remote objective',
      description: 'Remote purpose',
      owner: 'self' as const,
      priority: 2,
      labels: ['remote'],
      targetDate: '2026-11-01',
    };
    expect(reconcileInitiativeDraft(draft, baseline, incoming)).toEqual({
      ...incoming,
      description: 'Unsaved purpose',
      labels: ['new'],
      targetDate: '2026-12-01',
    });
  });
  it('does not retain a membership reorder as a dirty field during refresh', () => {
    const baseline = initiativeDraft(entity);
    const incoming = { ...baseline, labels: ['c'], projectSlugs: ['three'] };
    expect(
      reconcileInitiativeDraft(
        { ...baseline, labels: ['b', 'a'], projectSlugs: ['two', 'one'] },
        baseline,
        incoming,
      ),
    ).toEqual(incoming);
  });
});
