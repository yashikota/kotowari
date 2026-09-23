export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';

export type Label = {
  id: number;
  name: string;
  color: string;
};

export type Issue = {
  id: number;
  number: number;
  identifier: string;
  title: string;
  body: string;
  status: IssueStatus;
  priority: number;
  projectId: number | null;
  projectSlug?: string | null;
  cycleId: number | null;
  cycleNumber?: number | null;
  parentId: number | null;
  parentIdentifier?: string | null;
  depth: number;
  dueDate: string | null;
  sortOrder: number;
  labels: Label[];
  adrNumbers: number[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Project = {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
};

export type Cycle = {
  id: number;
  number: number;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: number;
  title: string;
  slug: string;
  body: string;
  parentId: number | null;
  parentSlug?: string | null;
  projectId: number | null;
  projectSlug?: string | null;
  status: string;
  date: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ADRStatus = 'proposed' | 'rejected' | 'accepted' | 'deprecated' | 'superseded';

export type ADR = {
  projectSlug?: string | null;
  id: number;
  number: number;
  identifier: string;
  title: string;
  body: string;
  publishBody: string;
  status: ADRStatus;
  evaluation: string;
  replay: string;
  workload: string;
  supersedes: number | null;
  issueNumbers: number[];
  createdAt: string;
  updatedAt: string;
};

export type View = {
  id: number;
  name: string;
  slug: string;
  display: 'list' | 'board';
  groupBy: string;
  orderBy: string;
  status: string | null;
  project: string | null;
  cycle: number | null;
  labels: string[];
  priority: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Diagnostic = {
  path: string;
  code: string;
  message: string;
};

export type Comment = {
  id: number;
  issueId: number;
  body: string;
  createdAt: string;
};

export type Activity = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Workspace = {
  name: string;
  timezone: string;
  locale: string;
  url: string;
  description: string;
  githubUrl: string;
  updatedAt: string;
};

export type SearchHit = {
  snippet?: string;
  kind: string;
  id: string;
  title: string;
};

export const ISSUE_STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

export const PROJECT_STATUSES = ['planned', 'started', 'completed', 'canceled'] as const;

export const CYCLE_STATUSES = ['upcoming', 'active', 'completed'] as const;

export const PAGE_STATUSES = ['proposed', 'accepted', 'deprecated', 'superseded'] as const;

export const ADR_STATUSES: ADRStatus[] = [
  'proposed',
  'rejected',
  'accepted',
  'deprecated',
  'superseded',
];

export function entityDir(n: number): string {
  return String(n).padStart(5, '0');
}
