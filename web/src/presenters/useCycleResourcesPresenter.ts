import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import i18n from '../i18n/index.ts';
import type { Cycle, Page } from '../types.ts';

export function useCycleResourcesPresenter({
  cycle,
  pages,
  refreshCycle,
  navigateToPage,
}: {
  cycle: Cycle;
  pages: Page[];
  refreshCycle: () => Promise<void>;
  navigateToPage: (slug: string) => unknown;
}) {
  const [resourceLinkOpen, setResourceLinkOpen] = useState(false);
  const [resourceURL, setResourceURL] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceError, setResourceError] = useState('');

  function pageSlugForResource(url: string): string | null {
    try {
      const parsed = new URL(url);
      const marker = '/pages/';
      const markerIndex = parsed.pathname.lastIndexOf(marker);
      if (parsed.origin !== window.location.origin || markerIndex < 0) return null;
      const candidate = parsed.pathname.slice(markerIndex + marker.length);
      return candidate && !candidate.includes('/') ? decodeURIComponent(candidate) : null;
    } catch {
      return null;
    }
  }

  const resources = (cycle.resources ?? []).map((resource) => {
    const pageSlug = pageSlugForResource(resource.url);
    const page = pageSlug ? pages.find((item) => item.slug === pageSlug) : undefined;
    return {
      ...resource,
      pageSlug,
      displayTitle: page?.title || resource.title || resource.url,
    };
  });

  async function createDocument() {
    const title = i18n.t('issueActions.newDocumentTitle');
    const page = await api.createPage({ title, slug: `document-${Date.now()}` });
    const href = new URL(
      `${import.meta.env.BASE_URL}pages/${encodeURIComponent(page.slug)}`,
      window.location.origin,
    ).toString();
    await api.addCycleResource(cycle.number, { url: href, title, kind: 'document' });
    await refreshCycle();
    await navigateToPage(page.slug);
  }

  function openResourceLink() {
    setResourceURL('');
    setResourceTitle('');
    setResourceError('');
    setResourceLinkOpen(true);
  }

  async function addResourceLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.addCycleResource(cycle.number, {
        url: resourceURL.trim(),
        title: resourceTitle.trim() || undefined,
      });
      setResourceLinkOpen(false);
      await refreshCycle();
    } catch {
      setResourceError(i18n.t('cycle.resourceAddFailed'));
    }
  }

  async function removeResource(resourceId: number) {
    await api.removeCycleResource(cycle.number, resourceId);
    await refreshCycle();
  }

  return {
    resources,
    resourceLinkOpen,
    resourceURL,
    resourceTitle,
    resourceError,
    onCreateDocument: createDocument,
    onOpenResourceLink: openResourceLink,
    onCloseResourceLink: () => setResourceLinkOpen(false),
    onResourceURLChange: (event: ChangeEvent<HTMLInputElement>) =>
      setResourceURL(event.target.value),
    onResourceTitleChange: (event: ChangeEvent<HTMLInputElement>) =>
      setResourceTitle(event.target.value),
    onAddResourceLink: addResourceLink,
    onRemoveResource: removeResource,
  };
}
