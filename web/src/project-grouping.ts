import type { ProjectGroupBy } from './project-views.ts';
import type { Project } from './types.ts';

export type ProjectGroup = {
  key: string;
  label: string;
  value?: ProjectGroupValue;
  projects: Project[];
};

export type ProjectGroupValue = string | null;

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function projectGroupValues(project: Project, groupBy: ProjectGroupBy): ProjectGroupValue[] {
  switch (groupBy) {
    case 'status':
      return [project.workflowStatus ?? project.status];
    case 'priority':
      return [String(project.priority)];
    case 'labels':
      return project.labels?.length ? [...new Set(project.labels)] : [null];
    case 'lead':
      return project.lead === 'self' ? ['self'] : [null];
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

export function compareProjectGroupValues(
  left: ProjectGroupValue,
  right: ProjectGroupValue,
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
  labelFor: (groupBy: ProjectGroupBy, value: ProjectGroupValue) => string,
): ProjectGroup[] {
  if (groupBy === 'none') {
    return projects.length ? [{ key: 'all', label: '', projects }] : [];
  }

  const grouped = new Map<string, { value: ProjectGroupValue; projects: Project[] }>();
  for (const project of projects) {
    const values = new Set(projectGroupValues(project, groupBy));
    for (const value of values) {
      const identity = JSON.stringify(value);
      const group = grouped.get(identity) ?? { value, projects: [] };
      group.projects.push(project);
      grouped.set(identity, group);
    }
  }

  return [...grouped.entries()]
    .sort(([, left], [, right]) =>
      compareProjectGroupValues(left.value, right.value, groupBy, statusOrder),
    )
    .map(([identity, group]) => ({
      key: `${groupBy}:${identity}`,
      label: labelFor(groupBy, group.value),
      value: group.value,
      projects: group.projects,
    }));
}
