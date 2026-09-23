import type { ADRStatus, IssueStatus, IssueType } from '../types.ts';
import i18n from './index.ts';

export function issueStatusLabel(status: IssueStatus): string {
  return i18n.t(`issueStatus.${status}`, { defaultValue: status });
}

export function priorityLabel(priority: number): string {
  return i18n.t(`priority.${priority}`, { defaultValue: String(priority) });
}

export function issueTypeLabel(type: IssueType): string {
  return i18n.t(`issueType.${type}`, { defaultValue: type });
}

export function adrStatusLabel(status: ADRStatus): string {
  return i18n.t(`adrStatus.${status}`, { defaultValue: status });
}
