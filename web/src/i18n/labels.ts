import type { ADRStatus, IssueStatus } from '../types.ts';
import i18n from './index.ts';

export function issueStatusLabel(status: IssueStatus): string {
  return i18n.t(`issueStatus.${status}`, { defaultValue: status });
}

export function priorityLabel(priority: number): string {
  return i18n.t(`priority.${priority}`, { defaultValue: String(priority) });
}

export function adrStatusLabel(status: ADRStatus): string {
  return i18n.t(`adrStatus.${status}`, { defaultValue: status });
}
