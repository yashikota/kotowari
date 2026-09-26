import type { Project } from './types.ts';
import { matchesProjectTitleSummary } from './project-views.ts';
import type { ProjectViewSearch } from './project-views.ts';

export function matchesProjectViewSearch(project: Project, search: ProjectViewSearch): boolean {
  const conditions: boolean[] = [];
  const status = search.status ?? [];
  const priorities = search.priority ?? [];
  const health = search.health ?? [];
  const labels = search.labels ?? [];
  const templates = search.templates ?? [];
  const initiatives = search.initiatives ?? [];
  const milestones = search.milestones ?? [];
  const relations = search.relations ?? [];

  if (search.specificProject) conditions.push(project.slug === search.specificProject);
  if (templates.length) {
    conditions.push(templates.includes(`template:${project.templateSlug ?? ''}`));
  }
  if (initiatives.length) {
    conditions.push(
      initiatives.some((value) =>
        value === 'initiative:none'
          ? !project.initiativeSlugs?.length
          : (project.initiativeSlugs ?? []).includes(value.slice('initiative:'.length)),
      ),
    );
  }
  if (status.length) {
    conditions.push(
      status.includes(project.workflowStatus ?? project.status) || status.includes(project.status),
    );
  }
  if (priorities.length) conditions.push(priorities.includes(String(project.priority)));
  if (health.length) conditions.push(health.includes(project.health || 'none'));
  if (labels.length) {
    conditions.push(labels.some((label) => (project.labels ?? []).includes(label)));
  }
  if (milestones.length) {
    conditions.push(
      milestones.some((name) => project.milestones.some((milestone) => milestone.name === name)),
    );
  }
  if (relations.length) {
    conditions.push(
      relations.some((kind) =>
        project.dependencies?.some((dependency) => dependency.kind === kind),
      ),
    );
  }
  if (search.dateField && (search.dateFrom || search.dateTo)) {
    const value =
      search.dateField === 'startDate'
        ? project.startDate
        : search.dateField === 'targetDate'
          ? project.targetDate
          : search.dateField === 'created'
            ? project.createdAt
            : search.dateField === 'updated'
              ? project.updatedAt
              : search.dateField === 'completed'
                ? project.completedAt
                : null;
    const date = value?.slice(0, 10);
    conditions.push(
      !!date &&
        (!search.dateFrom || date >= search.dateFrom) &&
        (!search.dateTo || date <= search.dateTo),
    );
  }

  const closed = project.status === 'completed' || project.status === 'canceled';
  if (search.closed === 'open') conditions.push(!closed);
  if (search.closed === 'closed') conditions.push(closed);
  if (search.q?.trim()) {
    conditions.push(matchesProjectTitleSummary(project, search.q, search.qOperator));
  }

  if (conditions.length === 0) return true;
  if (search.advancedFilter && search.filterOperator === 'or') {
    return conditions.some(Boolean);
  }
  return conditions.every(Boolean);
}
