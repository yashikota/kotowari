import { req } from './request.ts';
import type { ADR, Issue, Page } from '../types.ts';
export const documentApi = {
  pages: () => req<Page[]>('/api/pages'),
  page: (slug: string) => req<Page>(`/api/pages/${slug}`),
  createPage: (body: {
    title: string;
    slug: string;
    body?: string;
    status?: string;
    tags?: string[];
  }) => req<Page>('/api/pages', { method: 'POST', body: JSON.stringify(body) }),
  patchPage: (slug: string, body: Record<string, unknown>) =>
    req<Page>(`/api/pages/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePage: (slug: string) => req<void>(`/api/pages/${slug}`, { method: 'DELETE' }),
  adrs: () => req<ADR[]>('/api/adrs'),
  adr: (id: string) => req<ADR>(`/api/adrs/${id}`),
  createADR: (body: {
    projectSlug?: string | null;
    supersedes?: number;
    title: string;
    body?: string;
    status?: string;
    evaluation?: string;
    issueNumbers?: number[];
  }) => req<ADR>('/api/adrs', { method: 'POST', body: JSON.stringify(body) }),
  patchADR: (id: string, body: Record<string, unknown>) =>
    req<ADR>(`/api/adrs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  publishADR: (id: string) => req<ADR>(`/api/adrs/${id}/publish`, { method: 'POST' }),
  linkIssueADR: (issueId: string, number: number) =>
    req<Issue>(`/api/issues/${issueId}/links/adrs`, {
      method: 'POST',
      body: JSON.stringify({ number }),
    }),
  unlinkIssueADR: (issueId: string, number: number) =>
    req<void>(`/api/issues/${issueId}/links/adrs/${number}`, { method: 'DELETE' }),
  linkADRIssue: (adrId: string, number: number) =>
    req<ADR>(`/api/adrs/${adrId}/links/issues`, {
      method: 'POST',
      body: JSON.stringify({ number }),
    }),
  unlinkADRIssue: (adrId: string, number: number) =>
    req<void>(`/api/adrs/${adrId}/links/issues/${number}`, { method: 'DELETE' }),
};
