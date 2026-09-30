import { describe, expect, it } from 'vite-plus/test';
import {
  clearIssueSelection,
  extendIssueSelection,
  selectIssueIds,
  toggleIssueSelection,
} from './issue-selection.ts';

describe('issue selection', () => {
  it('extends and shrinks a range from its anchor', () => {
    const ids = ['A', 'B', 'C', 'D'];
    const initial = selectIssueIds(['B']);
    const extended = extendIssueSelection(ids, initial, 'D');
    const shrunk = extendIssueSelection(ids, extended, 'C');

    expect(extended.selectedIds).toEqual(['B', 'C', 'D']);
    expect(shrunk.selectedIds).toEqual(['B', 'C']);
    expect(shrunk.anchorId).toBe('B');
  });

  it('keeps selections outside a newly extended range', () => {
    const ids = ['A', 'B', 'C', 'D'];
    const initial = selectIssueIds(['A', 'D']);
    const extended = extendIssueSelection(ids, initial, 'B');

    expect(extended.selectedIds).toEqual(['A', 'D', 'B']);
    expect(extended.range?.baseIds).toEqual(['A', 'D']);
  });

  it('resets range state when toggling an issue or selecting a group', () => {
    const range = extendIssueSelection(['A', 'B', 'C'], selectIssueIds(['A']), 'C');

    expect(toggleIssueSelection(range, 'B', false)).toEqual({
      selectedIds: ['A', 'C'],
      anchorId: 'A',
      range: null,
    });
    expect(selectIssueIds(['C', 'B', 'C'])).toEqual({
      selectedIds: ['C', 'B'],
      anchorId: 'C',
      range: null,
    });
    expect(clearIssueSelection()).toEqual({ selectedIds: [], anchorId: null, range: null });
  });
});
