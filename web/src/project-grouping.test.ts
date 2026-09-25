import { describe, expect, it } from 'vite-plus/test';
import { groupProjects } from './project-grouping.ts';
import type { Project } from './types.ts';

function project(
  slug: string,
  values: Partial<
    Pick<
      Project,
      'status' | 'workflowStatus' | 'priority' | 'labels' | 'health' | 'startDate' | 'targetDate'
    >
  > = {},
): Project {
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

const labelGroup = (_groupBy: string, value: string | null) => value ?? 'Unassigned';

describe('groupProjects', () => {
  it('preserves the ungrouped list and orders known statuses before unknown statuses', () => {
    const projects = [
      project('unknown', { workflowStatus: 'custom' }),
      project('done', { workflowStatus: 'completed' }),
      project('planned', { workflowStatus: 'planned' }),
    ];

    expect(groupProjects(projects, 'none', [], labelGroup)).toEqual([
      { key: 'all', label: '', projects },
    ]);
    expect(
      groupProjects(projects, 'status', ['planned', 'completed'], labelGroup).map((g) => g.key),
    ).toEqual(['status:"planned"', 'status:"completed"', 'status:"custom"']);
  });

  it('places projects in every distinct label group and includes unlabelled projects', () => {
    const tagged = project('tagged', { labels: ['Bug', 'Feature', 'Bug'] });
    const unlabelled = project('unlabelled');
    const groups = groupProjects([tagged, unlabelled], 'labels', [], labelGroup);

    expect(groups.map((group) => group.label)).toEqual(['Bug', 'Feature', 'Unassigned']);
    expect(groups[0]?.projects).toEqual([tagged]);
    expect(groups[1]?.projects).toEqual([tagged]);
    expect(groups[2]?.projects).toEqual([unlabelled]);
  });

  it('orders health and date groups with missing values at the end', () => {
    const projects = [
      project('no-health-or-date'),
      project('off-track', { health: 'off_track', targetDate: '2026-12-01' }),
      project('on-track', { health: 'on_track', targetDate: '2026-09-01' }),
      project('at-risk', { health: 'at_risk', targetDate: '2026-10-01' }),
    ];

    expect(groupProjects(projects, 'health', [], labelGroup).map((group) => group.label)).toEqual([
      'on_track',
      'at_risk',
      'off_track',
      'Unassigned',
    ]);
    expect(
      groupProjects(projects, 'targetDate', [], labelGroup).map((group) => group.label),
    ).toEqual(['2026-09-01', '2026-10-01', '2026-12-01', 'Unassigned']);
  });
});
