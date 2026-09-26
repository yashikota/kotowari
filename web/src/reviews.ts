import type { Issue, IssueLink } from './types.ts';

export type ReviewIssue = Pick<Issue, 'identifier' | 'title' | 'status' | 'externalLinks'>;

export type LinkedPullRequest = {
  issueIdentifier: string;
  issueTitle: string;
  issueStatus: Issue['status'];
  linkId: IssueLink['id'];
  title: string;
  url: string;
  createdAt: string;
};

export function listLinkedPullRequests(issues: ReviewIssue[]): LinkedPullRequest[] {
  return issues
    .flatMap((issue) =>
      issue.externalLinks
        .filter((link) => link.kind === 'pullRequest')
        .map((link) => ({
          issueIdentifier: issue.identifier,
          issueTitle: issue.title,
          issueStatus: issue.status,
          linkId: link.id,
          title: link.title?.trim() || link.url,
          url: link.url,
          createdAt: link.createdAt,
        })),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
