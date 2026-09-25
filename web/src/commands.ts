export type Command = {
  id: string;
  title: string;
  hint?: string;
  keywords?: string;
};

export type TranslateCommand = (key: string, values?: Record<string, string | number>) => string;

export function staticCommands(t: TranslateCommand): Command[] {
  return [
    { id: 'new-issue', title: t('commands.createIssue'), hint: 'c' },
    { id: 'new-adr', title: t('commands.createAdr'), hint: 'p' },
    { id: 'new-page', title: t('commands.createPage') },
    { id: 'new-view', title: t('commands.createView') },
    { id: 'goto-search', title: t('commands.goToSearch') },
    { id: 'goto-issues', title: t('commands.goToIssues') },
    { id: 'goto-board', title: t('commands.goToBoard') },
    { id: 'goto-adrs', title: t('commands.goToAdrs') },
    { id: 'goto-projects', title: t('commands.goToProjects') },
    { id: 'goto-cycles', title: t('commands.goToCycles') },
    { id: 'goto-pages', title: t('commands.goToPages') },
    { id: 'goto-config', title: t('commands.goToConfig') },
    { id: 'goto-agent', title: t('commands.goToAgent') },
    { id: 'goto-active-cycle', title: t('commands.goToActiveCycle') },
    { id: 'copy-identifier', title: t('commands.copyIdentifier') },
    { id: 'keyboard-help', title: t('commands.keyboardHelp'), hint: '?' },
    {
      id: 'set-status-backlog',
      title: t('commands.setStatus', { status: t('issueStatus.backlog') }),
      hint: 's',
    },
    {
      id: 'set-status-todo',
      title: t('commands.setStatus', { status: t('issueStatus.todo') }),
      hint: 's',
    },
    {
      id: 'set-status-in_progress',
      title: t('commands.setStatus', { status: t('issueStatus.in_progress') }),
      hint: 's',
    },
    {
      id: 'set-status-done',
      title: t('commands.setStatus', { status: t('issueStatus.done') }),
      hint: 's',
    },
    {
      id: 'set-status-canceled',
      title: t('commands.setStatus', { status: t('issueStatus.canceled') }),
      hint: 's',
    },
  ];
}

export function cycleCommands(
  cycles: { id: number; number: number; status: string }[],
  t: TranslateCommand,
): Command[] {
  const cmds = cycles.map((c) => ({
    id: `assign-cycle:${c.id}`,
    title: t('commands.assignToCycle', { number: c.number }),
    keywords: `${t('field.cycle')} ${t(`cycle.status.${c.status}`)}`,
  }));
  cmds.push({
    id: 'assign-cycle:none',
    title: t('commands.removeFromCycle'),
    keywords: `${t('commands.keywordUnassign')} ${t('field.cycle')}`,
  });
  return cmds;
}

export function projectCommands(
  projects: { id: number; name: string; slug: string }[],
  t: TranslateCommand,
): Command[] {
  const cmds = projects.map((p) => ({
    id: `assign-project:${p.id}`,
    title: t('commands.assignToProject', { name: p.name }),
    keywords: `${t('field.project')} ${p.slug}`,
  }));
  cmds.push({
    id: 'assign-project:none',
    title: t('commands.removeFromProject'),
    keywords: `${t('commands.keywordUnassign')} ${t('field.project')}`,
  });
  return cmds;
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return commands;
  }
  return commands.filter((c) => {
    const hay = `${c.title} ${c.id} ${c.keywords ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}
