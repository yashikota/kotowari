import { describe, expect, it } from 'vite-plus/test';
import { planIssueCSVImport, type IssueImportContext } from './issue-import.ts';

const context: IssueImportContext = {
  statuses: [
    { id: 'backlog', name: 'Backlog', category: 'backlog' },
    { id: 'todo', name: 'Todo', category: 'todo' },
    { id: 'in_progress', name: 'In Progress', category: 'in_progress' },
    { id: 'done', name: 'Done', category: 'done' },
    { id: 'canceled', name: 'Canceled', category: 'canceled' },
    { id: 'review', name: 'Review', category: 'in_progress' },
  ],
  projects: [],
  cycles: [],
  labels: [{ id: 7, name: 'Bug', color: 'red' }],
  issues: [],
};

describe('Linear CSV import', () => {
  it('preserves multiline descriptions and escaped quotes with BOM and CRLF', () => {
    const [row] = planIssueCSVImport(
      '\uFEFFTitle,Description,Status,Priority,Labels\r\n"Fix, it","  First\r\nSecond ""quoted""  ",Review,High,Bug\r\n',
      context,
    );
    expect(row.issue).toMatchObject({
      title: 'Fix, it',
      body: '  First\r\nSecond "quoted"  ',
      skipDefaultTemplate: true,
      status: 'in_progress',
      workflowStatus: 'review',
      priority: 2,
      labelIds: [7],
    });
    expect(row.warnings).toEqual([]);
  });

  it('recognizes Japanese export values and retains empty descriptions', () => {
    const [row] = planIssueCSVImport(
      'Title,Description,Status,Priority\nWork,,進行中,緊急',
      context,
    );
    expect(row.issue).toMatchObject({ body: '', status: 'in_progress', priority: 1 });
    expect(row.warnings).toEqual([]);
  });

  it('reports unresolved properties and invalid calendar dates', () => {
    const [row] = planIssueCSVImport(
      'Title,Status,Priority,Estimate,Assignee,Project,Labels,Due Date,Parent issue\nWork,Mystery,Unknown,1.5,Alice,Absent,Unknown,2026-02-30,EXT-1',
      context,
    );
    expect(row.warnings.map((warning) => warning.field)).toEqual([
      'status',
      'priority',
      'estimate',
      'assignee',
      'project',
      'labels',
      'dueDate',
      'parent',
    ]);
    expect(row.issue).toMatchObject({ status: 'backlog', priority: 0, labelIds: [] });
    expect(row.issue.dueDate).toBeUndefined();
  });

  it('marks a missing title as unimportable', () => {
    expect(planIssueCSVImport('Title,Description\n,Body', context)[0].error).toBe('missingTitle');
  });

  it.each(['Title\n"unfinished', 'Title\nabc"def', 'Title\n"abc"def'])(
    'rejects malformed quoted fields: %s',
    (csv) => {
      expect(() => planIssueCSVImport(csv, context)).toThrow('INVALID_CSV');
    },
  );

  it('rejects absent title headers and oversized imports', () => {
    expect(() => planIssueCSVImport('Description\nBody', context)).toThrow('MISSING_TITLE_COLUMN');
    expect(() => planIssueCSVImport(`Title\n${'Work\n'.repeat(5001)}`, context)).toThrow(
      'TOO_MANY_ROWS',
    );
  });

  it.each([
    'Title,title\nFirst,Second',
    'Title,\nFirst,Second',
    'Title,Description\nFirst',
    'Title,Description\nFirst,Second,Third',
  ])('rejects ambiguous headers and shifted columns: %s', (csv) => {
    expect(() => planIssueCSVImport(csv, context)).toThrow('INVALID_CSV');
  });
});
