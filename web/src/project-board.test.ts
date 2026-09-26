import { describe, expect, it } from 'vite-plus/test';
import {
  buildProjectBoardLayout,
  moveProjectBoardGroup,
  orderProjectBoardGroups,
  PROJECT_BOARD_GROUPINGS,
  projectBoardHiddenPatch,
  projectBoardOrderPatch,
  projectBoardSearchHidden,
  projectBoardSearchOrder,
} from './project-board.ts';
import type { Project } from './types.ts';

const groups = [
  { key: 'backlog', label: 'Backlog', visible: true },
  { key: 'planned', label: 'Planned', visible: true },
  { key: 'started', label: 'In Progress', visible: true },
];

function project(slug: string, values: Partial<Project> = {}): Project {
  return {
    id: slug.length,
    name: slug,
    slug,
    description: '',
    status: 'planned',
    priority: 0,
    startDate: null,
    targetDate: null,
    progress: 0,
    milestones: [],
    createdAt: '',
    updatedAt: '',
    ...values,
  };
}

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

  it('builds a rows-by-health matrix for owned and unassigned projects', () => {
    const owned = project('owned', { lead: 'self', health: 'at_risk' });
    const unassigned = project('unassigned', { health: 'on_track' });
    const layout = buildProjectBoardLayout({
      projects: [owned, unassigned],
      columnsBy: 'lead',
      rowsBy: 'health',
      statuses: ['planned', 'started'],
      labels: [],
      showEmpty: true,
      labelFor: (groupBy, value) => `${groupBy}:${value ?? 'none'}`,
    });

    const selfColumn = layout.model.columns.find((column) => column.value === 'self');
    const unassignedColumn = layout.model.columns.find((column) => column.value === null);
    const riskRow = layout.model.rows.find((row) => row.value === 'at_risk');
    expect(layout.groups.map((group) => group.label)).toEqual(['lead:self', 'lead:none']);
    expect(selfColumn).toBeDefined();
    expect(unassignedColumn).toBeDefined();
    expect(riskRow?.cells[selfColumn?.key ?? '']).toEqual([owned]);
    expect(riskRow?.cells[unassignedColumn?.key ?? '']).toEqual([]);
    expect(layout.model.rows.map((row) => row.label)).toEqual([
      'health:on_track',
      'health:at_risk',
      'health:off_track',
      'health:none',
    ]);
  });

  it('groups arbitrary labels and date values without unsafe board-cell keys', () => {
    const tagged = project('tagged', {
      labels: ['Feature: needs review', '日本語 ラベル'],
      startDate: '2026-09-14',
      targetDate: '2026-10-14',
    });
    const layout = buildProjectBoardLayout({
      projects: [tagged],
      columnsBy: 'labels',
      rowsBy: 'targetDate',
      statuses: ['planned'],
      labels: ['Feature: needs review', '日本語 ラベル'],
      showEmpty: true,
      labelFor: (_groupBy, value) => value ?? 'No value',
    });

    expect(layout.model.columns.map((column) => column.label)).toEqual([
      'Feature: needs review',
      '日本語 ラベル',
      'No value',
    ]);
    expect(layout.model.columns.every((column) => /^[a-z0-9_-]{1,48}$/i.test(column.key))).toBe(
      true,
    );
    const targetDateRow = layout.model.rows.find((row) => row.value === '2026-10-14');
    expect(targetDateRow?.cells).toEqual({
      [layout.model.columns[0]!.key]: [tagged],
      [layout.model.columns[1]!.key]: [tagged],
      [layout.model.columns[2]!.key]: [],
    });
  });

  it('stores ordering and visibility independently for every supported grouping', () => {
    let search = {};
    for (const grouping of PROJECT_BOARD_GROUPINGS) {
      const order = [`${grouping}_second`, `${grouping}_first`];
      const hidden = [`${grouping}_first`];
      search = {
        ...search,
        ...projectBoardOrderPatch(grouping, order),
        ...projectBoardHiddenPatch(grouping, hidden),
      };
      expect(projectBoardSearchOrder(search, grouping)).toEqual(order);
      expect(projectBoardSearchHidden(search, grouping)).toEqual(hidden);
    }
  });
});
