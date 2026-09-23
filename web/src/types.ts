export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';
export type IssueType = 'bug' | 'feature' | 'improvement' | 'task';

export type Label = {
  id: number;
  name: string;
  color: string;
};

export type IssueLink = {
  id: number;
  url: string;
  title?: string;
  kind: 'link' | 'pullRequest' | 'document';
  createdAt: string;
};

export type IssueRelation = {
  id: number;
  kind: 'related' | 'blocks' | 'blockedBy' | 'duplicateOf' | 'duplicateBy';
  targetIdentifier: string;
};

export type Issue = {
  id: number;
  number: number;
  identifier: string;
  title: string;
  body: string;
  status: IssueStatus;
  type?: IssueType;
  priority: number;
  estimate?: number | null;
  projectId: number | null;
  projectSlug?: string | null;
  milestoneId: number | null;
  milestoneName?: string | null;
  cycleId: number | null;
  cycleNumber?: number | null;
  cycleAddedAt?: string | null;
  parentId: number | null;
  parentIdentifier?: string | null;
  recurringSlug?: string | null;
  depth: number;
  dueDate: string | null;
  reminderAt: string | null;
  sortOrder: number;
  labels: Label[];
  adrNumbers: number[];
  externalLinks: IssueLink[];
  relations: IssueRelation[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string;
  startedAt?: string | null;
  completedAt: string | null;
};

export type IssueTemplate = {
  slug: string;
  name: string;
  title: string;
  body: string;
  status: IssueStatus;
  type?: IssueType;
  priority: number;
  estimate?: number | null;
  labels: string[];
};

export type RecurringIssue = {
  slug: string;
  name: string;
  title: string;
  body: string;
  status: IssueStatus;
  type?: IssueType;
  priority: number;
  estimate?: number | null;
  projectSlug?: string | null;
  labels: string[];
  firstDueDate: string;
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  nextDueDate: string;
  lastIssueIdentifier?: string;
  enabled: boolean;
};

export type Project = {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  priority: number;
  startDate: string | null;
  targetDate: string | null;
  labels?: string[];
  progress: number;
  milestones: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectMilestone = {
  id: number;
  name: string;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Cycle = {
  id: number;
  number: number;
  name?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isFavorite?: boolean;
  resources?: IssueLink[];
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
  subGroupBy?: string;
  orderBy: string;
  direction?: 'asc' | 'desc';
  completedIssues?: string;
  showSubIssues?: boolean | null;
  nestedSubIssues?: string;
  showEmptyGroups?: boolean;
  displayProperties?: string[];
  status: string | null;
  project: string | null;
  cycle: number | null;
  labels: string[];
  priority: number | null;
  type: IssueType | null;
  estimate: number | null;
  dueDate?: string;
  relation?: string | null;
  content?: string | null;
  milestoneName?: string | null;
  dateField?: string;
  dateRange?: string;
  projectStatus?: string | null;
  projectPriority?: number | null;
  projectLabels?: string[];
  addedToCycle?: ('planned' | 'during' | 'after')[];
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

export type AgentChat = {
  id: string;
  title: string;
  updatedAt: number;
};

export const ISSUE_STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

export const PROJECT_STATUSES = ['backlog', 'planned', 'started', 'completed', 'canceled'] as const;

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
