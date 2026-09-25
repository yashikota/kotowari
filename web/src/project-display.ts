export const PROJECT_DISPLAY_PROPERTIES = [
  'id',
  'milestones',
  'summary',
  'priority',
  'status',
  'health',
  'lead',
  'dependencies',
  'startDate',
  'targetDate',
  'issues',
  'progress',
  'created',
  'updated',
  'completed',
  'labels',
] as const;

export type ProjectDisplayProperty = (typeof PROJECT_DISPLAY_PROPERTIES)[number];

export const DEFAULT_PROJECT_DISPLAY_PROPERTIES: ProjectDisplayProperty[] = [
  'status',
  'progress',
  'targetDate',
];
