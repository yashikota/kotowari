import type { IssueSearch } from './api.ts';
import type { IssueFilterGroup } from './issue-advanced-filter.ts';

function normalizeQuery(query: string): string {
  return query
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[’']/g, '')
    .replace(/[!?.,。！？]/g, ' ')
    .replace(/\s+/g, ' ');
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  return next.toISOString().slice(0, 10);
}

function localDateNow(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFilter(start: string, end: string): IssueFilterGroup {
  return {
    kind: 'group',
    operator: 'and',
    children: [
      { kind: 'condition', field: 'dueDate', operator: 'onOrAfter', value: start },
      { kind: 'condition', field: 'dueDate', operator: 'onOrBefore', value: end },
    ],
  };
}

/** Interprets common, local issue-filter phrases without sending workspace data to a service. */
export function interpretIssueFilterQuery(
  query: string,
  today: string = localDateNow(),
): IssueSearch | undefined {
  const normalized = normalizeQuery(query);
  if (
    /^(assigned to me|issues assigned to me|my issues|mine|自分に割り当て済み|自分のイシュー)$/.test(
      normalized,
    )
  ) {
    return { assignee: 'self' };
  }
  if (/^(unassigned|no assignee|without an assignee|担当者なし|未割り当て)$/.test(normalized)) {
    return { assignee: 'none' };
  }
  if (/^(assigned to agent|agent assigned|エージェントに割り当て済み)$/.test(normalized)) {
    return { assignee: 'agent' };
  }
  if (
    /^(completed|done|closed)( in| during)? (the )?(last|past) month$/.test(normalized) ||
    /^(過去1か月に完了|先月完了|先月完了したイシュー)$/.test(normalized)
  ) {
    return { dateField: 'completedAt', dateRange: 'monthAgo' };
  }
  if (/^(overdue|past due|期限超過|期限切れ)$/.test(normalized)) {
    return { dueDate: 'overdue' };
  }
  if (/^(due today|期限が今日|今日が期限)$/.test(normalized)) {
    return { dueDate: 'today' };
  }

  const englishWindow = normalized.match(
    /^(?:due|deadline)(?: in)? (?:the )?(?:next|coming) (\d{1,3}) (days?|weeks?)$/,
  );
  const japaneseWindow = normalized.match(/^今後(\d{1,3})(日|週間)以内に期限$/);
  const window = englishWindow ?? japaneseWindow;
  if (window) {
    const amount = Number(window[1]);
    const days = japaneseWindow
      ? window[2] === '週間'
        ? amount * 7
        : amount
      : window[2]!.startsWith('week')
        ? amount * 7
        : amount;
    if (amount > 0 && days <= 366) {
      return {
        advancedFilter: true,
        advancedFilterGroup: dateFilter(today, addDays(today, days)),
      };
    }
  }

  if (/^(urgent|urgent priority|緊急|緊急度高)$/.test(normalized)) return { priority: 1 };
  if (/^(high priority|priority high|優先度高|高優先度)$/.test(normalized)) {
    return { priority: 2 };
  }
  if (/^(medium priority|priority medium|優先度中|中優先度)$/.test(normalized)) {
    return { priority: 3 };
  }
  if (/^(low priority|priority low|優先度低|低優先度)$/.test(normalized)) {
    return { priority: 4 };
  }
  if (/^(no priority|without priority|優先度なし|優先度未設定)$/.test(normalized)) {
    return { priority: 0 };
  }
  return undefined;
}
