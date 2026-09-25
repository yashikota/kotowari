import { describe, expect, it } from 'vite-plus/test';
import { cycleCommands, filterCommands, projectCommands, staticCommands } from './commands.ts';

const english: Record<string, string> = {
  'commands.createIssue': 'Create issue',
  'commands.createAdr': 'Create ADR',
  'commands.createPage': 'Create page',
  'commands.createView': 'Create view',
  'commands.goToSearch': 'Search',
  'commands.goToIssues': 'Go to Issues',
  'commands.goToBoard': 'Go to Board',
  'commands.goToAdrs': 'Go to ADRs',
  'commands.goToProjects': 'Go to Projects',
  'commands.goToCycles': 'Go to Cycles',
  'commands.goToPages': 'Go to Pages',
  'commands.goToConfig': 'Go to Config',
  'commands.goToAgent': 'Go to Agent',
  'commands.goToActiveCycle': 'Go to active cycle',
  'commands.copyIdentifier': 'Copy identifier',
  'commands.keyboardHelp': 'Keyboard shortcuts',
  'commands.setStatus': 'Set status: {{status}}',
  'issueStatus.backlog': 'Backlog',
  'issueStatus.todo': 'Todo',
  'issueStatus.in_progress': 'In Progress',
  'issueStatus.done': 'Done',
  'issueStatus.canceled': 'Canceled',
  'commands.assignToCycle': 'Assign to Cycle {{number}}',
  'commands.removeFromCycle': 'Remove from cycle',
  'commands.assignToProject': 'Assign to {{name}}',
  'commands.removeFromProject': 'Remove from project',
  'commands.keywordUnassign': 'unassign',
  'field.cycle': 'Cycle',
  'cycle.status.active': 'Current',
  'cycle.status.upcoming': 'Upcoming',
  'field.project': 'Project',
};

const t = (key: string, values?: Record<string, string | number>) =>
  Object.entries(values ?? {}).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    english[key] ?? key,
  );
const commands = staticCommands(t);

describe('filterCommands', () => {
  it('returns all commands for an empty query', () => {
    expect(filterCommands(commands, '')).toHaveLength(commands.length);
  });

  it('matches titles and stable command ids', () => {
    const hits = filterCommands(commands, 'adr');
    expect(hits.map((command) => command.id)).toContain('new-adr');
    expect(hits.map((command) => command.id)).toContain('goto-adrs');
  });

  it('matches status commands through localized status labels and ids', () => {
    const hits = filterCommands(commands, 'done');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe('set-status-done');
  });

  it('matches by command id and returns no unknown matches', () => {
    expect(filterCommands(commands, 'keyboard-help').map((command) => command.id)).toEqual([
      'keyboard-help',
    ]);
    expect(filterCommands(commands, 'assignee')).toEqual([]);
  });
});

describe('cycleCommands', () => {
  it('builds localized assign and remove commands from cycles', () => {
    const result = cycleCommands(
      [
        { id: 10, number: 1, status: 'active' },
        { id: 11, number: 2, status: 'upcoming' },
      ],
      t,
    );
    expect(result.map((command) => command.id)).toEqual([
      'assign-cycle:10',
      'assign-cycle:11',
      'assign-cycle:none',
    ]);
    expect(result[0]?.title).toBe('Assign to Cycle 1');
  });

  it('still offers remove when there are no cycles', () => {
    expect(cycleCommands([], t).map((command) => command.id)).toEqual(['assign-cycle:none']);
  });
});

describe('projectCommands', () => {
  it('builds localized assign and remove commands from projects', () => {
    const result = projectCommands(
      [
        { id: 4, name: 'Harbor', slug: 'harbor' },
        { id: 5, name: 'Dock', slug: 'dock' },
      ],
      t,
    );
    expect(result.map((command) => command.id)).toEqual([
      'assign-project:4',
      'assign-project:5',
      'assign-project:none',
    ]);
    expect(result[0]?.title).toBe('Assign to Harbor');
  });

  it('still offers remove when there are no projects', () => {
    expect(projectCommands([], t).map((command) => command.id)).toEqual(['assign-project:none']);
  });
});
