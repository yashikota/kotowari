import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import i18n from '../i18n/index.ts';
import type { ADR, Issue, IssueLink } from '../types.ts';

type Props = {
  identifier: string;
  issue: Issue | null;
  adrs: ADR[];
  reload: () => Promise<void>;
  onCloseIssueOptions: () => void;
};

export function useIssueDetailResources({
  identifier,
  issue,
  adrs,
  reload,
  onCloseIssueOptions,
}: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const [adrPick, setAdrPick] = useState('');
  const [externalLinkURL, setExternalLinkURL] = useState('');
  const [externalLinkTitle, setExternalLinkTitle] = useState('');
  const [externalLinkKind, setExternalLinkKind] = useState<IssueLink['kind']>('link');
  const [externalLinkOpen, setExternalLinkOpen] = useState(false);
  const [resourcesCollapsed, setResourcesCollapsed] = useState(false);

  const linkedAdrs = adrs.filter((adr) => (issue?.adrNumbers ?? []).includes(adr.number));
  const unlinkedAdrs = adrs.filter((adr) => !(issue?.adrNumbers ?? []).includes(adr.number));

  async function addExternalLink() {
    const url = externalLinkURL.trim();
    if (!url) return;
    await api.addIssueLink(identifier, {
      url,
      title: externalLinkTitle.trim() || undefined,
      kind: externalLinkKind,
    });
    setExternalLinkURL('');
    setExternalLinkTitle('');
    setExternalLinkKind('link');
    setExternalLinkOpen(false);
    await reload();
  }

  async function createIssueDocument() {
    if (!issue) return;
    onCloseIssueOptions();
    const title = i18n.t('issueActions.newDocumentTitle');
    const page = await api.createPage({ title, slug: `document-${Date.now()}` });
    const href = new URL(
      `${import.meta.env.BASE_URL}pages/${encodeURIComponent(page.slug)}`,
      window.location.origin,
    ).toString();
    await api.addIssueLink(identifier, { url: href, title, kind: 'document' });
    await reload();
    await router.invalidate();
    await navigate({ to: '/pages/$slug', params: { slug: page.slug } });
  }

  function openExternalLink(kind: IssueLink['kind']) {
    onCloseIssueOptions();
    setExternalLinkKind(kind);
    setExternalLinkURL('');
    setExternalLinkTitle('');
    setExternalLinkOpen(true);
  }

  function openLinkedCode() {
    if (!issue) return;
    const pullRequest = issue.externalLinks.find((link) => link.kind === 'pullRequest');
    const githubIssue = issue.externalLinks.find((link) => {
      if (link.kind !== 'link') return false;
      try {
        const url = new URL(link.url);
        return (
          url.protocol === 'https:' &&
          url.hostname.toLowerCase() === 'github.com' &&
          /^\/[^/]+\/[^/]+\/issues\/\d+(?:\/|$)/i.test(url.pathname)
        );
      } catch {
        return false;
      }
    });
    const candidate = pullRequest ?? githubIssue;
    if (!candidate) return;
    try {
      const url = new URL(candidate.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      // Ignore malformed links rather than turning a keyboard shortcut into navigation.
    }
  }

  async function removeExternalLink(link: IssueLink) {
    await api.removeIssueLink(identifier, link.id);
    await reload();
  }

  return {
    data: {
      adrPick,
      externalLinkURL,
      externalLinkTitle,
      externalLinkKind,
      externalLinkOpen,
      resourcesCollapsed,
      linkedAdrs,
      unlinkedAdrs,
    },
    handlers: {
      onClick14: async (adr: ADR) => {
        await api.unlinkIssueADR(identifier, adr.number);
        await reload();
      },
      Link_ADR_onChange15: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setAdrPick(e.target.value),
      onClick16: async () => {
        const number = Number(adrPick);
        if (!number) return;
        await api.linkIssueADR(identifier, number);
        setAdrPick('');
        await reload();
        await router.invalidate();
      },
      External_link_URL_onChange24: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setExternalLinkURL(e.target.value),
      External_link_title_onChange25: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setExternalLinkTitle(e.target.value),
      External_link_kind_onChange26: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setExternalLinkKind(e.target.value as IssueLink['kind']),
      onOpenExternalLink: (kind: IssueLink['kind']) => openExternalLink(kind),
      Open_linked_code_onClick: () => openLinkedCode(),
      onCloseExternalLink: () => setExternalLinkOpen(false),
      onToggleResources: () => setResourcesCollapsed((current) => !current),
      External_link_onSubmit27: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return addExternalLink();
      },
      onRemoveExternalLink28: (link: IssueLink) => removeExternalLink(link),
      Create_document_onClick44: () => createIssueDocument(),
    },
  };
}
