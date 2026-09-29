import type { ProjectGroupValue } from './project-grouping.ts';
import type { ProjectGroupBy } from './project-view-search.ts';

export function projectGroupLabel(
  by: ProjectGroupBy,
  value: ProjectGroupValue,
  {
    language,
    translate,
    statusLabel,
    priorityLabel,
  }: {
    language: string;
    translate: (key: string) => string;
    statusLabel: (id: string) => string;
    priorityLabel: (priority: number) => string;
  },
): string {
  if (value === null) {
    if (by === 'labels') return translate('projectList.groupNoLabel');
    if (by === 'lead') return translate('projectList.leadUnassigned');
    if (by === 'startDate' || by === 'targetDate') return translate('projectList.groupNoDate');
    if (by === 'health') return translate('projectHealth.status.none');
  }
  if (by === 'status') return statusLabel(value ?? '');
  if (by === 'priority') return priorityLabel(Number(value));
  if (by === 'lead') return translate('projectList.leadYou');
  if (by === 'health') return translate(`projectHealth.status.${value}`);
  if (by === 'startDate' || by === 'targetDate') {
    const [year, month, day] = (value ?? '').split('-').map(Number);
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
  return value ?? '';
}
