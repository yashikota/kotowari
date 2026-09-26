import { describe, expect, it } from 'vite-plus/test';
import { moveProjectBoardGroup, orderProjectBoardGroups } from './project-board.ts';

const groups = [
  { key: 'backlog', label: 'Backlog', visible: true },
  { key: 'planned', label: 'Planned', visible: true },
  { key: 'started', label: 'In Progress', visible: true },
];

describe('project board group ordering', () => {
  it('applies saved order and appends new groups once', () => {
    expect(
      orderProjectBoardGroups(
        [...groups, { key: 'custom', label: 'Custom', visible: true }],
        ['planned', 'planned', 'missing'],
      ).map((group) => group.key),
    ).toEqual(['planned', 'backlog', 'started', 'custom']);
  });

  it('moves a group to an index and clamps out-of-range destinations', () => {
    const order = groups.map((group) => group.key);
    expect(moveProjectBoardGroup(order, 'backlog', 1)).toEqual(['planned', 'backlog', 'started']);
    expect(moveProjectBoardGroup(order, 'started', -1)).toEqual(['started', 'backlog', 'planned']);
    expect(moveProjectBoardGroup(order, 'backlog', 99)).toEqual(['planned', 'started', 'backlog']);
  });

  it('leaves the order unchanged when the group is missing or alone', () => {
    expect(moveProjectBoardGroup(['backlog'], 'backlog', 0)).toEqual(['backlog']);
    expect(moveProjectBoardGroup(['backlog', 'planned'], 'missing', 1)).toEqual([
      'backlog',
      'planned',
    ]);
  });
});
