import type { ProjectGroupBy } from './project-views.ts';
import type { Project } from './types.ts';

export type ProjectGroup = {
  key: string;
  label: string;
  projects: Project[];
};

type GroupValue = string | null;

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function valuesForProject(project: Project, groupBy: ProjectGroupBy): GroupValue[] {
  switch (groupBy) {
    case 'status':
      return [project.workflowStatus ?? project.status];
    case 'priority':
      return [String(project.priority)];
    case 'labels':
      return project.labels?.length ? [...new Set(project.labels)] : [null];
    case 'health':
      return [project.health ?? null];
    case 'startDate':
      return [project.startDate?.slice(0, 10) ?? null];
    case 'targetDate':
      return [project.targetDate?.slice(0, 10) ?? null];
    case 'none':
      return [];
  }
}

function compareGroupValues(
  left: GroupValue,
  right: GroupValue,
  groupBy: ProjectGroupBy,
  statusOrder: readonly string[],
) {
  if (left === null || right === null) {
    if (left === right) return 0;
    return left === null ? 1 : -1;
  }
  if (groupBy === 'status') {
    const leftIndex = statusOrder.indexOf(left);
    const rightIndex = statusOrder.indexOf(right);
    if (leftIndex !== rightIndex) {
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    }
  } else if (groupBy === 'priority') {
    const order = ['1', '2', '3', '4', '0'];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    if (leftIndex !== rightIndex) {
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    }
  } else if (groupBy === 'health') {
    const order = ['on_track', 'at_risk', 'off_track'];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    if (leftIndex !== rightIndex) {
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    }
  }
  return compareText(left, right);
}

export function groupProjects(
  projects: Project[],
  groupBy: ProjectGroupBy,
  statusOrder: readonly string[],
  labelFor: (groupBy: ProjectGroupBy, value: GroupValue) => string,
): ProjectGroup[] {
  if (groupBy === 'none') {
    return projects.length ? [{ key: 'all', label: '', projects }] : [];
  }

  const grouped = new Map<string, { value: GroupValue; projects: Project[] }>();
  for (const project of projects) {
    const values = new Set(valuesForProject(project, groupBy));
    for (const value of values) {
      const identity = JSON.stringify(value);
      const group = grouped.get(identity) ?? { value, projects: [] };
      group.projects.push(project);
      grouped.set(identity, group);
    }
  }

  return [...grouped.entries()]
    .sort(([, left], [, right]) =>
      compareGroupValues(left.value, right.value, groupBy, statusOrder),
    )
    .map(([identity, group]) => ({
      key: `${groupBy}:${identity}`,
      label: labelFor(groupBy, group.value),
      projects: group.projects,
    }));
}
