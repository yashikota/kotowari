import { describe, expect, it } from 'vite-plus/test';
import { issuesQuery, parseIssueSearch, searchToFilter } from './api.ts';

describe('issuesQuery', () => {
  it('returns empty string when no filters are set', () => {
    expect(issuesQuery({})).toBe('');
    expect(issuesQuery({ status: null, labels: [], priority: -1 })).toBe('');
  });

  it('encodes compound filters used by saved views', () => {
    expect(
      issuesQuery({
        status: 'todo',
        project: 'harbor',
        cycle: 2,
        labels: ['Bug', 'Feature'],
        priority: 1,
      }),
    ).toBe('?status=todo&project=harbor&cycle=2&labels=Bug%2CFeature&priority=1');
  });

  it('encodes issue type and estimate filters including zero estimates', () => {
    expect(issuesQuery({ type: 'feature', estimate: 0 })).toBe('?type=feature&estimate=0');
  });

  it('encodes relative and exact due-date filters with a stable date anchor', () => {
    expect(issuesQuery({ dueDate: 'week', asOf: '2026-05-15' })).toBe(
      '?dueDate=week&asOf=2026-05-15',
    );
    expect(issuesQuery({ dueDate: 'on:2026-05-18', asOf: '2026-05-15' })).toBe(
      '?dueDate=on%3A2026-05-18&asOf=2026-05-15',
    );
  });

  it('encodes relationship filters for issue views', () => {
    expect(issuesQuery({ relation: 'blocked' })).toBe('?relation=blocked');
  });

  it('encodes content searches without changing their display value', () => {
    expect(issuesQuery({ content: '  Moonstone migration  ' })).toBe(
      '?content=Moonstone+migration',
    );
  });

  it('encodes milestone-name contains filters', () => {
    expect(issuesQuery({ milestoneName: '  Beta rollout  ' })).toBe('?milestoneName=Beta+rollout');
  });

  it('encodes linked project properties, including the no-priority value', () => {
    expect(issuesQuery({ projectStatus: 'started', projectPriority: 0 })).toBe(
      '?projectStatus=started&projectPriority=0',
    );
  });

  it('encodes multiple project-label filters', () => {
    expect(issuesQuery({ projectLabels: ['Launch', 'Customer'] })).toBe(
      '?projectLabels=Launch%2CCustomer',
    );
  });

  it('encodes added-to-cycle phases', () => {
    expect(issuesQuery({ addedToCycle: ['planned', 'during', 'after'] })).toBe(
      '?addedToCycle=planned%2Cduring%2Cafter',
    );
  });

  it('selects archived issues', () => {
    expect(issuesQuery({ archived: true })).toBe('?archived=true');
  });

  it('encodes issue date fields and relative or exact timeframes', () => {
    expect(
      issuesQuery({ dateField: 'createdAt', dateRange: 'weekAgo', dateAsOf: '2026-05-15' }),
    ).toBe('?dateField=createdAt&dateRange=weekAgo&dateAsOf=2026-05-15');
    expect(
      issuesQuery({ dateField: 'completedAt', dateRange: 'on:2026-05-10', dateAsOf: '2026-05-15' }),
    ).toBe('?dateField=completedAt&dateRange=on%3A2026-05-10&dateAsOf=2026-05-15');
  });
});

describe('parseIssueSearch', () => {
  it('drops empty and invalid values', () => {
    expect(parseIssueSearch({ status: '', cycle: 'nope', priority: '' })).toEqual({});
  });

  it('accepts only an explicit archived view flag', () => {
    expect(parseIssueSearch({ archived: 'true' })).toEqual({ archived: true });
    expect(parseIssueSearch({ archived: 'yes' })).toEqual({});
  });

  it('accepts numeric cycle and priority zero', () => {
    expect(parseIssueSearch({ cycle: 3, priority: 0 })).toEqual({ cycle: 3, priority: 0 });
  });

  it('drops cycle zero', () => {
    expect(parseIssueSearch({ cycle: 0 })).toEqual({});
  });

  it('keeps the same fields saved views use', () => {
    expect(
      parseIssueSearch({
        status: 'todo',
        project: 'harbor',
        cycle: '2',
        priority: '1',
        labels: 'Bug,Feature',
      }),
    ).toEqual({
      status: 'todo',
      project: 'harbor',
      cycle: 2,
      priority: 1,
      labels: 'Bug,Feature',
    });
  });

  it('parses issue type and estimate search parameters', () => {
    expect(parseIssueSearch({ type: 'feature', estimate: '8' })).toEqual({
      type: 'feature',
      estimate: 8,
    });
    expect(parseIssueSearch({ type: 'epic', estimate: '1000' })).toEqual({});
  });

  it('accepts Linear due-date ranges and exact dates while rejecting invalid dates', () => {
    expect(parseIssueSearch({ dueDate: 'quarter' })).toEqual({ dueDate: 'quarter' });
    expect(parseIssueSearch({ dueDate: 'on:2026-05-18' })).toEqual({
      dueDate: 'on:2026-05-18',
    });
    expect(parseIssueSearch({ dueDate: 'on:2026-02-30' })).toEqual({});
  });

  it('accepts only supported issue relationship filters', () => {
    expect(parseIssueSearch({ relation: 'duplicate' })).toEqual({ relation: 'duplicate' });
    expect(parseIssueSearch({ relation: 'team' })).toEqual({});
  });

  it('keeps non-empty content filters and ignores whitespace-only queries', () => {
    expect(parseIssueSearch({ content: '  Moonstone migration  ' })).toEqual({
      content: '  Moonstone migration  ',
    });
    expect(parseIssueSearch({ content: '   ' })).toEqual({});
  });

  it('keeps non-empty milestone name filters and ignores whitespace-only queries', () => {
    expect(parseIssueSearch({ milestoneName: '  Beta rollout  ' })).toEqual({
      milestoneName: '  Beta rollout  ',
    });
    expect(parseIssueSearch({ milestoneName: '  ' })).toEqual({});
  });

  it('accepts known linked project statuses and priorities', () => {
    expect(parseIssueSearch({ projectStatus: 'backlog', projectPriority: '0' })).toEqual({
      projectStatus: 'backlog',
      projectPriority: 0,
    });
    expect(parseIssueSearch({ projectStatus: 'active', projectPriority: '8' })).toEqual({});
  });

  it('parses distinct project label filters and ignores empty entries', () => {
    expect(parseIssueSearch({ projectLabels: 'Launch, Customer,Launch,,__none__' })).toEqual({
      projectLabels: ['Launch', 'Customer', '__none__'],
    });
  });

  it('parses only supported added-to-cycle phases without duplicates', () => {
    expect(parseIssueSearch({ addedToCycle: 'planned,unknown,during,planned' })).toEqual({
      addedToCycle: ['planned', 'during'],
    });
    expect(parseIssueSearch({ addedToCycle: 'planned,after,during,planned' })).toEqual({});
  });

  it('accepts supported issue date fields, timeframes, and custom dates', () => {
    expect(parseIssueSearch({ dateField: 'updatedAt', dateRange: 'quarterAgo' })).toEqual({
      dateField: 'updatedAt',
      dateRange: 'quarterAgo',
    });
    expect(parseIssueSearch({ dateField: 'createdAt', dateRange: 'on:2026-05-10' })).toEqual({
      dateField: 'createdAt',
      dateRange: 'on:2026-05-10',
    });
    expect(parseIssueSearch({ dateField: 'createdAt', dateRange: 'on:2026-02-30' })).toEqual({});
    expect(parseIssueSearch({ dateField: 'creator', dateRange: 'weekAgo' })).toEqual({});
    expect(
      parseIssueSearch({ dateField: 'timeInCurrentStatus', dateRange: 'twoWeeksAgo' }),
    ).toEqual({
      dateField: 'timeInCurrentStatus',
      dateRange: 'twoWeeksAgo',
    });
  });
});

describe('searchToFilter', () => {
  it('splits label names for the issues API', () => {
    expect(
      searchToFilter({
        status: 'todo',
        labels: 'Bug, Feature',
        priority: 1,
      }),
    ).toEqual({
      status: 'todo',
      project: undefined,
      cycle: undefined,
      labels: ['Bug', 'Feature'],
      priority: 1,
      projectLabels: undefined,
      addedToCycle: undefined,
      milestoneName: undefined,
      content: undefined,
      dateField: undefined,
      dateRange: undefined,
      projectStatus: undefined,
      projectPriority: undefined,
    });
  });

  it('omits labels when the search has none', () => {
    expect(searchToFilter({})).toEqual({
      status: undefined,
      archived: undefined,
      project: undefined,
      cycle: undefined,
      labels: undefined,
      priority: undefined,
      projectLabels: undefined,
      addedToCycle: undefined,
      milestoneName: undefined,
      content: undefined,
      dateField: undefined,
      dateRange: undefined,
      projectStatus: undefined,
      projectPriority: undefined,
    });
  });
});

describe('issuesQuery priority zero', () => {
  it('encodes no-priority as priority=0', () => {
    expect(issuesQuery({ priority: 0 })).toBe('?priority=0');
  });
});
