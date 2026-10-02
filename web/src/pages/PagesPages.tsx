import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Box, Button, Group, NativeSelect, Stack, Text, TextInput } from '@mantine/core';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { AIPanel } from '../components/AIPanel.tsx';
import { DocumentListDisplayOptions } from '../components/DocumentListDisplayOptions.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { usePageDetailPagePresenter, usePagesPagePresenter } from '../presenters/PagesPages.tsx';
import { PAGE_STATUSES } from '../types.ts';
import { EmptyState, MetaBadge, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

export function PagesPageView({ model }: { model: ReturnType<typeof usePagesPagePresenter> }) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { rows, handlers } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title={t('nav.pages')}
              actions={<Button onClick={handlers.onCreatePage}>{t('commands.createPage')}</Button>}
            />
            <Group p="sm" wrap="wrap">
              <TextInput
                aria-label={t('documentList.search')}
                placeholder={t('documentList.search')}
                value={model.query}
                onChange={handlers.onQuery}
                style={{ flex: 1, minWidth: 160 }}
              />
              <DocumentListDisplayOptions
                model={model}
                opened={model.displayOptionsOpen}
                onChange={handlers.onDisplayOptionsChange}
              />
              <NativeSelect
                aria-label={t('documentList.projectFilter')}
                value={model.projectFilter}
                onChange={handlers.onProjectFilter}
                data={[
                  { value: 'all', label: t('documentList.allProjects') },
                  { value: 'none', label: t('documentList.noProject') },
                  ...model.projects.map((project) => ({
                    value: String(project.id),
                    label: project.name,
                  })),
                ]}
              />
            </Group>

            <Group px="sm" pb="sm" wrap="wrap">
              <NativeSelect
                aria-label={t('documentList.dateField')}
                value={model.dateFilter.field}
                onChange={handlers.onDateField}
                data={[
                  { value: 'createdAt', label: t('documentList.created') },
                  { value: 'updatedAt', label: t('documentList.updated') },
                ]}
              />
              <NativeSelect
                aria-label={t('documentList.dateRange')}
                value={model.dateFilter.range}
                onChange={handlers.onDateRange}
                data={[
                  { value: 'all', label: t('documentList.anyDate') },
                  ...(
                    [
                      ['last:1d', 'dayAgo'],
                      ['last:3d', 'threeDaysAgo'],
                      ['last:1w', 'weekAgo'],
                      ['last:1m', 'monthAgo'],
                      ['last:3m', 'quarterAgo'],
                      ['last:6m', 'halfYearAgo'],
                      ['last:1y', 'yearAgo'],
                    ] as const
                  ).map(([value, label]) => ({ value, label: t(`documentList.${label}`) })),
                  { value: 'custom', label: t('documentList.customDate') },
                ]}
              />
              {model.dateFilter.range === 'custom' ? (
                <>
                  <TextInput
                    type="date"
                    aria-label={t('documentList.dateFrom')}
                    value={model.dateFilter.from}
                    onChange={handlers.onDateFrom}
                  />
                  <TextInput
                    type="date"
                    aria-label={t('documentList.dateTo')}
                    value={model.dateFilter.to}
                    onChange={handlers.onDateTo}
                  />
                </>
              ) : null}
            </Group>
            {model.query ||
            model.projectFilter !== 'all' ||
            model.dateFilter.range !== 'all' ||
            model.onlyMyProjects ? (
              <Group px="sm" pb="sm">
                <Button variant="subtle" onClick={handlers.onClearFilters}>
                  {t('documentList.clearFilters')}
                </Button>
              </Group>
            ) : null}
            {rows.length === 0 ? (
              <EmptyState
                action={
                  !model.query &&
                  model.projectFilter === 'all' &&
                  model.dateFilter.range === 'all' ? (
                    <Button onClick={handlers.onCreatePage}>{t('commands.createPage')}</Button>
                  ) : undefined
                }
              >
                {t(
                  model.pages.length > 0 ||
                    model.query ||
                    model.projectFilter !== 'all' ||
                    model.dateFilter.range !== 'all'
                    ? 'documentList.noMatches'
                    : 'documentList.empty',
                )}
              </EmptyState>
            ) : (
              <Stack gap={0} role="list" aria-label={t('nav.pages')}>
                {rows.map(({ page: p, depth, heading }) => (
                  <Box key={p.slug}>
                    {heading ? (
                      <Text role="heading" aria-level={3} fw={600} px="md" py="xs">
                        {heading.name ?? t('documentList.noProject')} · {heading.count}
                      </Text>
                    ) : null}
                    <Link
                      role="listitem"
                      to="/pages/$slug"
                      params={{ slug: p.slug }}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <Group
                        wrap="nowrap"
                        gap="xs"
                        py={6}
                        pr="md"
                        pl={12 + depth * 16}
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
                        {(
                          [
                            ['createdAt', model.showCreated, t('documentList.created')],
                            ['updatedAt', model.showUpdated, t('documentList.updated')],
                          ] as const
                        ).map(([field, visible, label]) =>
                          visible && Number.isFinite(new Date(p[field]).getTime()) ? (
                            <Text
                              key={field}
                              component="time"
                              dateTime={p[field]}
                              size="xs"
                              c="dimmed"
                              aria-label={`${label}: ${p[field]}`}
                              title={`${label}: ${p[field]}`}
                              style={{ flexShrink: 0 }}
                            >
                              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                                new Date(p[field]),
                              )}
                            </Text>
                          ) : null,
                        )}
                      </Group>
                    </Link>
                  </Box>
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
  titleRef,
}: {
  model: ReturnType<typeof usePageDetailPagePresenter>;
  titleRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { slug, page, pages, projects, tagDraft, handlers } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title={page.title}
              actions={
                <Group gap="xs" wrap="wrap">
                  <NativeSelect
                    aria-label={t('ui.pageStatus')}
                    value={page.status}
                    onChange={handlers.Page_status_onChange0}
                    data={PAGE_STATUSES.map((s) => ({ value: s, label: s }))}
                  />
                  <Button type="button" variant="subtle" color="red" onClick={handlers.onClick1}>
                    {t('ui.delete')}
                  </Button>
                </Group>
              }
            />
            <Stack gap="md">
              <TextInput
                ref={titleRef}
                aria-label={t('ui.pageTitle')}
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
                  aria-label={t('ui.parentPage')}
                  label={t('ui.parentPage')}
                  value={page.parentId ?? ''}
                  onChange={handlers.Parent_page_onChange4}
                  data={[
                    { value: '', label: t('issueProperties.noParent') },
                    ...pages
                      .filter((p) => p.slug !== slug)
                      .map((p) => ({ value: String(p.id), label: p.title })),
                  ]}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <NativeSelect
                  aria-label={t('ui.project')}
                  label={t('field.project')}
                  value={page.projectId ?? ''}
                  onChange={handlers.Page_project_onChange5}
                  data={[
                    { value: '', label: t('field.noProject') },
                    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                  ]}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <TextInput
                  type="date"
                  aria-label={t('ui.documentDate')}
                  label={t('ui.documentDate')}
                  value={page.date?.slice(0, 10) ?? ''}
                  onChange={handlers.Document_date_onChange6}
                  style={{ flex: 1, minWidth: 160 }}
                />
              </Group>
              <TextInput
                aria-label={t('ui.tags')}
                placeholder={t('ui.tagsCommaSeparated')}
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
  const autofocusTitle = useAutofocusTarget('title');
  const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle, [model.slug]);
  return <PageDetailPageView model={{ ...model, handlers } as typeof model} titleRef={titleRef} />;
}
