import type { Issue } from './types.ts';

export type IssueCopyKind =
  | 'id'
  | 'url'
  | 'title'
  | 'titleLink'
  | 'issueMarkdown'
  | 'markdown'
  | 'branch'
  | 'prompt'
  | 'pullRequestUrls';

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

export const DEFAULT_CODING_PROMPT_TEMPLATE =
  'Work on Linear issue {{issue.identifier}}:\nSuggested branch name: {{issue.branchName}}\n{{context}}';

export function renderIssuePrompt(issue: Issue, template: string, issueURL: string): string {
  const values: Record<string, string> = {
    'issue.identifier': issue.identifier,
    'issue.title': issue.title,
    'issue.branchName': issueBranchName(issue),
    context: issueMarkdown(issue, issueURL, true).trim(),
  };
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, key: string) => values[key] ?? '');
}

export function issuePrompt(issue: Issue): string {
  return renderIssuePrompt(
    issue,
    DEFAULT_CODING_PROMPT_TEMPLATE,
    `/issues/${encodeURIComponent(issue.identifier)}`,
  );
}
