import type { ProjectViewSearch } from './project-view-search.ts';
import type { Project } from './types.ts';

type ProjectOrderBy = NonNullable<ProjectViewSearch['orderBy']>;

export function sortProjectList(
  visibleProjects: Project[],
  originalProjects: Project[],
  orderBy: ProjectOrderBy,
  direction: 'asc' | 'desc',
  manualOrder: string[] | undefined,
  workflowStatuses: readonly string[],
): Project[] {
  const directionFactor = direction === 'desc' ? -1 : 1;
  const originalOrder = new Map(originalProjects.map((project, index) => [project.slug, index]));
  const manualOrderIndex = new Map((manualOrder ?? []).map((slug, index) => [slug, index]));
  const statusOrder = new Map(workflowStatuses.map((status, index) => [status, index]));

  return visibleProjects.sort((left, right) => {
    let result = 0;
    if (orderBy === 'manual') {
      const leftIndex = manualOrderIndex.get(left.slug);
      const rightIndex = manualOrderIndex.get(right.slug);
      if (leftIndex !== undefined || rightIndex !== undefined) {
        if (leftIndex === undefined) return 1;
        if (rightIndex === undefined) return -1;
        result = leftIndex - rightIndex;
      } else {
        result = (originalOrder.get(left.slug) ?? 0) - (originalOrder.get(right.slug) ?? 0);
      }
    } else if (orderBy === 'priority') {
      const rank = (value: number) => (value === 0 ? 5 : value);
      result = rank(left.priority) - rank(right.priority);
    } else if (orderBy === 'status') {
      result =
        (statusOrder.get(left.workflowStatus ?? left.status) ?? 0) -
        (statusOrder.get(right.workflowStatus ?? right.status) ?? 0);
    } else if (orderBy === 'healthUpdated') {
      const leftDate = left.healthUpdatedAt || '';
      const rightDate = right.healthUpdatedAt || '';
      if (!leftDate || !rightDate) {
        if (leftDate !== rightDate) return leftDate ? -1 : 1;
      } else result = leftDate.localeCompare(rightDate);
    } else {
      const field =
        orderBy === 'name'
          ? 'name'
          : orderBy === 'startDate'
            ? 'startDate'
            : orderBy === 'targetDate'
              ? 'targetDate'
              : orderBy === 'created'
                ? 'createdAt'
                : 'updatedAt';
      const value = (project: Project) => project[field] ?? '';
      result = value(left).localeCompare(value(right));
    }
    return result === 0 ? left.slug.localeCompare(right.slug) : result * directionFactor;
  });
}

export function manualProjectOrder(projects: Project[], manualOrder?: string[]): string[] {
  const originalOrder = new Map(projects.map((project, index) => [project.slug, index]));
  return projects
    .map((project) => project.slug)
    .sort((left, right) => {
      const leftIndex = manualOrder?.indexOf(left) ?? -1;
      const rightIndex = manualOrder?.indexOf(right) ?? -1;
      if (leftIndex >= 0 || rightIndex >= 0) {
        if (leftIndex < 0) return 1;
        if (rightIndex < 0) return -1;
        return leftIndex - rightIndex;
      }
      return (originalOrder.get(left) ?? 0) - (originalOrder.get(right) ?? 0);
    });
}
