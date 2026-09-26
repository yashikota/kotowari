import type { Project } from './types.ts';
import { matchesProjectTitleSummary } from './project-views.ts';
import type { ProjectFilterCondition } from './project-views.ts';
import type { ProjectViewSearch } from './project-views.ts';

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAfterPeriod(today: Date, period: string): string | undefined {
  const match = /^within:(\d+)([dmy])$/.exec(period);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const result = new Date(today);
  if (match[2] === 'd') result.setDate(result.getDate() + amount);
  if (match[2] === 'm') {
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + amount);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
  }
  if (match[2] === 'y') result.setFullYear(result.getFullYear() + amount);
  return localDateString(result);
}

function matchesDateValue(project: Project, field: ProjectFilterCondition): boolean {
  const dateValue = (() => {
    switch (field.field) {
      case 'createdDate':
        return project.createdAt;
      case 'updatedDate':
        return project.updatedAt;
      case 'startDate':
        return project.startDate;
      case 'targetDate':
        return project.targetDate;
      case 'completedDate':
        return project.completedAt;
      default:
        return undefined;
    }
  })();
  const value = field.value;
  if (!value) return true;
  const date = dateValue?.slice(0, 10);
  if (value === 'no-date') return !date;
  if (!date) return false;
  if (value === 'overdue') {
    const now = new Date();
    const today = localDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    return date < today;
  }
  if (value === 'custom') {
    return (!field.dateFrom || date >= field.dateFrom) && (!field.dateTo || date <= field.dateTo);
  }
  const periodEnd = dateAfterPeriod(new Date(), value);
  return periodEnd ? date <= periodEnd : false;
}

function matchesAdvancedFilterGroup(
  project: Project,
  group: NonNullable<ProjectViewSearch['advancedFilterGroup']>,
): boolean {
  if (group.children.length === 0) return true;
  const matches = group.children.map((child) => {
    if (child.kind === 'group') return matchesAdvancedFilterGroup(project, child);
    if (!child.field || !child.value) return true;

    const value = child.value;
    const operator = child.operator ?? 'is';
    if (
      child.field === 'createdDate' ||
      child.field === 'updatedDate' ||
      child.field === 'startDate' ||
      child.field === 'targetDate' ||
      child.field === 'completedDate'
    ) {
      if (value === 'custom' && !child.dateFrom && !child.dateTo) return true;
      const found = matchesDateValue(project, child);
      return operator === 'isNot' ? !found : found;
    }

    const values = (() => {
      switch (child.field) {
        case 'status':
          return [project.workflowStatus ?? project.status, project.status];
        case 'priority':
          return [String(project.priority)];
        case 'health':
          return [project.health || 'none'];
        case 'label':
          return project.labels ?? [];
        case 'milestone':
          return project.milestones.map((milestone) => milestone.name);
        case 'relation':
          return (project.dependencies ?? []).map((dependency) => dependency.kind);
        case 'initiative':
          return project.initiativeSlugs?.length
            ? project.initiativeSlugs.map((slug) => `initiative:${slug}`)
            : ['initiative:none'];
        case 'template':
          return [`template:${project.templateSlug ?? ''}`];
        case 'project':
          return [project.slug];
        case 'lead':
          return [project.lead === 'self' ? 'self' : 'none'];
        case 'title':
          return [`${project.name} ${project.summary ?? ''}`.toLocaleLowerCase()];
        default:
          return [];
      }
    })();

    const found =
      operator === 'contains' || operator === 'doesNotContain'
        ? values.some((candidate) =>
            candidate.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
          )
        : values.includes(value);
    return operator === 'isNot' || operator === 'doesNotContain' ? !found : found;
  });
  return group.operator === 'or' ? matches.some(Boolean) : matches.every(Boolean);
}

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

  const matchesFacets =
    conditions.length === 0
      ? true
      : search.advancedFilter && search.filterOperator === 'or'
        ? conditions.some(Boolean)
        : conditions.every(Boolean);
  return (
    matchesFacets &&
    (!search.advancedFilterGroup || matchesAdvancedFilterGroup(project, search.advancedFilterGroup))
  );
}
