import type { Issue } from './types.ts';

export function issueBranchName(issue: Issue): string {
  const title = issue.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return title ? `${issue.identifier.toLowerCase()}-${title}` : issue.identifier.toLowerCase();
}

export function issueMarkdown(issue: Issue, url: string, everything = false): string {
  const sections = [`# ${issue.identifier} ${issue.title}`, issue.body.trim()].filter(Boolean);
  if (!everything) return `${sections.join('\n\n')}\n`;

  const properties = [
    `URL: ${url}`,
    `Status: ${issue.status}`,
    `Priority: ${issue.priority}`,
    issue.type ? `Type: ${issue.type}` : '',
    issue.estimate != null ? `Estimate: ${issue.estimate}` : '',
    issue.dueDate ? `Due date: ${issue.dueDate}` : '',
    issue.projectSlug ? `Project: ${issue.projectSlug}` : '',
    issue.cycleNumber != null ? `Cycle: ${issue.cycleNumber}` : '',
    issue.labels.length > 0 ? `Labels: ${issue.labels.map((label) => label.name).join(', ')}` : '',
    issue.parentIdentifier ? `Parent: ${issue.parentIdentifier}` : '',
  ].filter(Boolean);
  sections.push(`---\n\n${properties.join('\n')}`);
  if (issue.externalLinks.length > 0) {
    const links = ['## Links'];
    for (const link of issue.externalLinks)
      links.push(`- [${link.title || link.url}](${link.url}) (${link.kind})`);
    sections.push(links.join('\n'));
  }
  if (issue.relations.length > 0) {
    const relations = ['## Relations'];
    for (const relation of issue.relations)
      relations.push(`- ${relation.kind}: ${relation.targetIdentifier}`);
    sections.push(relations.join('\n'));
  }
  return `${sections.join('\n\n')}\n`;
}

export function issuePrompt(issue: Issue): string {
  const description = issue.body.trim();
  const properties = [
    `Status: ${issue.status}`,
    `Priority: ${issue.priority}`,
    issue.type ? `Type: ${issue.type}` : '',
    issue.projectSlug ? `Project: ${issue.projectSlug}` : '',
    issue.dueDate ? `Due date: ${issue.dueDate}` : '',
  ].filter(Boolean);
  return [`Help me work on ${issue.identifier}: ${issue.title}`, description, properties.join('\n')]
    .filter(Boolean)
    .join('\n\n');
}
