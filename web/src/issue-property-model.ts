export type IssueOptionalProperty = 'dueDate' | 'milestone' | 'parent' | 'type';
export type IssuePropertyMenu =
  | 'status'
  | 'priority'
  | 'assignee'
  | 'labels'
  | 'estimate'
  | 'cycle'
  | 'project'
  | null;
export type OptionalIssuePropertyVisibility = Record<IssueOptionalProperty, boolean>;
