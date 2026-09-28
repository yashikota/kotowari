import { describe, expect, it } from 'vite-plus/test';
import { interpretIssueFilterQuery } from './issue-filter-query.ts';

describe('interpretIssueFilterQuery', () => {
  it('recognizes the single-user assignee suggestions in English and Japanese', () => {
    expect(interpretIssueFilterQuery('assigned to me')).toEqual({ assignee: 'self' });
    expect(interpretIssueFilterQuery('未割り当て')).toEqual({ assignee: 'none' });
    expect(interpretIssueFilterQuery('エージェントに割り当て済み')).toEqual({ assignee: 'agent' });
  });

  it('maps recent completion language to the existing completed-date filter', () => {
    expect(interpretIssueFilterQuery('completed in the last month')).toEqual({
      dateField: 'completedAt',
      dateRange: 'monthAgo',
    });
    expect(interpretIssueFilterQuery('先月完了')).toEqual({
      dateField: 'completedAt',
      dateRange: 'monthAgo',
    });
  });

  it('creates an inclusive, date-stable window for upcoming due dates', () => {
    expect(interpretIssueFilterQuery('due in the next 2 weeks', '2026-09-28')).toEqual({
      advancedFilter: true,
      advancedFilterGroup: {
        kind: 'group',
        operator: 'and',
        children: [
          { kind: 'condition', field: 'dueDate', operator: 'onOrAfter', value: '2026-09-28' },
          { kind: 'condition', field: 'dueDate', operator: 'onOrBefore', value: '2026-10-12' },
        ],
      },
    });
    expect(
      interpretIssueFilterQuery('今後3日以内に期限', '2026-09-28')?.advancedFilterGroup,
    ).toMatchObject({ children: [{ value: '2026-09-28' }, { value: '2026-10-01' }] });
  });

  it('recognizes urgency and due-state phrases but rejects unsupported text', () => {
    expect(interpretIssueFilterQuery('High priority')).toEqual({ priority: 2 });
    expect(interpretIssueFilterQuery('期限超過')).toEqual({ dueDate: 'overdue' });
    expect(interpretIssueFilterQuery('all the important work')).toBeUndefined();
    expect(interpretIssueFilterQuery('due in the next 100 weeks', '2026-09-28')).toBeUndefined();
  });
});
