import { Link } from '@tanstack/react-router';
import {
  Box,
  Button,
  Group,
  NativeSelect,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { AIPanel } from '../components/AIPanel.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { usePageDetailPagePresenter, usePagesPagePresenter } from '../presenters/PagesPages.tsx';
import type { Page } from '../types.ts';
import { PAGE_STATUSES } from '../types.ts';
import { EmptyState, MetaBadge, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

function pageDepth(pages: Page[], page: Page): number {
  let depth = 0;
  let parentId = page.parentId;
  const byId = new Map(pages.map((p) => [p.id, p]));
  const seen = new Set<number>();
  while (parentId) {
    if (seen.has(parentId)) {
      break;
    }
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) {
      break;
    }
    depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}

export function PagesPageView({ model }: { model: ReturnType<typeof usePagesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { pages } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader title="Pages" />
            {pages.length === 0 ? (
              <EmptyState>No pages. Use the command palette to create one.</EmptyState>
            ) : (
              <Stack gap={0}>
                {pages.map((p) => (
                  <Link
                    key={p.slug}
                    to="/pages/$slug"
                    params={{ slug: p.slug }}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <Group
                      wrap="nowrap"
                      gap="xs"
                      py={6}
                      pr="md"
                      pl={12 + pageDepth(pages, p) * 16}
                      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <Box
                        w={2}
                        h={16}
                        bg="var(--mantine-color-default-border)"
                        style={{ borderRadius: 1, flexShrink: 0 }}
                      />
                      <Text ff="monospace" size="xs" c="dimmed" w={72} style={{ flexShrink: 0 }}>
                        {p.status}
                      </Text>
                      <Text flex={1} truncate>
                        {p.title}
                      </Text>
                      <MetaBadge>{p.slug}</MetaBadge>
                    </Group>
                  </Link>
                ))}
              </Stack>
            )}
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function PagesPage() {
  return (
    <PresenterScope name="PagesPage">
      <PagesPageBinding />
    </PresenterScope>
  );
}

function PagesPageBinding() {
  const model = usePagesPagePresenter();
  const handlers = useActions(model.handlers);
  return <PagesPageView model={{ ...model, handlers } as typeof model} />;
}

export function PageDetailPageView({
  model,
}: {
  model: ReturnType<typeof usePageDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { slug, page, pages, projects, tagDraft, handlers } = model;
      const autofocusTitle = useAutofocusTarget('title');
      const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle, [slug]);
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title={page.slug}
              actions={
                <Group gap="xs" wrap="wrap">
                  <NativeSelect
                    aria-label="Page status"
                    value={page.status}
                    onChange={handlers.Page_status_onChange0}
                    data={PAGE_STATUSES.map((s) => ({ value: s, label: s }))}
                  />
                  <Button type="button" variant="subtle" color="red" onClick={handlers.onClick1}>
                    Delete
                  </Button>
                </Group>
              }
            />
            <Stack gap="md">
              <TextInput
                ref={titleRef}
                aria-label="Page title"
                value={page.title}
                onChange={handlers.Page_title_onChange2}
                onBlur={handlers.Page_title_onBlur3}
                variant="unstyled"
                styles={{
                  input: {
                    fontSize: 'var(--mantine-h3-font-size)',
                    fontWeight: 600,
                    padding: 0,
                  },
                }}
              />
              <Group gap="md" wrap="wrap" align="flex-end">
                <NativeSelect
                  aria-label="Parent page"
                  label="Parent page"
                  value={page.parentId ?? ''}
                  onChange={handlers.Parent_page_onChange4}
                  data={[
                    { value: '', label: 'No parent' },
                    ...pages
                      .filter((p) => p.slug !== slug)
                      .map((p) => ({ value: String(p.id), label: p.title })),
                  ]}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <NativeSelect
                  aria-label="Page project"
                  label="Project"
                  value={page.projectId ?? ''}
                  onChange={handlers.Page_project_onChange5}
                  data={[
                    { value: '', label: 'No project' },
                    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                  ]}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <TextInput
                  type="date"
                  aria-label="Document date"
                  label="Document date"
                  value={page.date?.slice(0, 10) ?? ''}
                  onChange={handlers.Document_date_onChange6}
                  style={{ flex: 1, minWidth: 160 }}
                />
              </Group>
              <TextInput
                aria-label="Tags"
                placeholder="tags, comma separated"
                value={tagDraft}
                onChange={handlers.Tags_onChange7}
                onBlur={handlers.Tags_onBlur8}
              />
              <AIPanel kind="pages" id={slug} />
              <DocumentEditor documentKey={`pages/${slug}/body`} />
            </Stack>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function PageDetailPage() {
  return (
    <PresenterScope name="PageDetailPage">
      <PageDetailPageBinding />
    </PresenterScope>
  );
}

function PageDetailPageBinding() {
  const model = usePageDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <PageDetailPageView model={{ ...model, handlers } as typeof model} />;
}
