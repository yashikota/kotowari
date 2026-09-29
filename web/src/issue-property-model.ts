export type IssueOptionalProperty = 'dueDate' | 'milestone' | 'parent' | 'type';
export type IssuePropertyMenu = 'status' | 'priority' | 'labels' | 'estimate' | null;
export type OptionalIssuePropertyVisibility = Record<IssueOptionalProperty, boolean>;
