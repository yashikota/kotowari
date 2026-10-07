import { useRef } from 'react';
import { adrStatusLabel } from '../i18n/labels.ts';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { ConfirmActionDialog } from '../design-system/ConfirmActionDialog.tsx';
import { DocumentTitle } from '../design-system/DocumentTitle.tsx';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Box, Button, Group, NativeSelect, Stack, Text, TextInput } from '@mantine/core';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen, useActionFocusReturn } from '../focus.ts';
import { AIPanel } from '../components/AIPanel.tsx';
import { DocumentListDisplayOptions } from '../components/DocumentListDisplayOptions.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { usePageDetailPagePresenter, usePagesPagePresenter } from '../presenters/PagesPages.tsx';
import { PAGE_STATUSES } from '../types.ts';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import styles from '../design-system/DocumentListRow.module.css';

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
            {rows.length > 0 &&
            (model.query ||
              model.projectFilter !== 'all' ||
              model.dateFilter.range !== 'all' ||
              model.onlyMyProjects) ? (
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
                  model.dateFilter.range === 'all' &&
                  !model.onlyMyProjects ? (
                    <Button onClick={handlers.onCreatePage}>{t('commands.createPage')}</Button>
                  ) : (
                    <Button variant="default" onClick={handlers.onClearFilters}>
                      {t('documentList.clearFilters')}
                    </Button>
                  )
                }
              >
                {t(
                  model.pages.length > 0 ||
                    model.query ||
                    model.projectFilter !== 'all' ||
                    model.dateFilter.range !== 'all' ||
                    model.onlyMyProjects
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
                      className={styles.documentLink}
                    >
                      <Group
                        className={`${styles.documentRow} ${styles.pageRow}`}
                        pl={12 + Math.min(depth, 4) * 16}
                      >
                        <Text
                          lineClamp={2}
                          title={p.title}
                          style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                        >
                          {p.title}
                        </Text>
                        <Group className={styles.metadata} gap="xs" wrap="wrap">
                          <Text
                            className={styles.documentStatus}
                            size="sm"
                            c="dimmed"
                            data-document-status
                          >
                            {adrStatusLabel(p.status)}
                          </Text>
                          <Text className={styles.slug} ff="monospace" size="xs" c="dimmed">
                            {p.slug}
                          </Text>
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
  titleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
  const { t } = useTranslation();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const editingDisabled = model.propertiesSaving || model.deletePending || model.deleteConfirmed;
  const runPropertyAction = useActionFocusReturn(
    model.propertiesSaving,
    () =>
      feedbackRef.current?.querySelector<HTMLButtonElement>(
        '[role="alert"] button:not(:disabled)',
      ) ?? titleRef.current,
  );

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
                    disabled={editingDisabled}
                    aria-label={t('ui.pageStatus')}
                    value={page.status}
                    onChange={handlers.Page_status_onChange0}
                    data={PAGE_STATUSES.map((s) => ({ value: s, label: adrStatusLabel(s) }))}
                  />
                  <Button
                    type="button"
                    disabled={editingDisabled}
                    variant="subtle"
                    color="red"
                    onClick={handlers.onClick1}
                  >
                    {t('ui.delete')}
                  </Button>
                </Group>
              }
            />
            <Stack gap="md" maw={960} mx="auto" w="100%" py="md">
              <Box ref={feedbackRef}>
                <SaveFeedback
                  saving={model.propertiesSaving}
                  saved={model.propertiesSaved}
                  error={model.propertiesError}
                  savingLabel={t('pageProperties.saving')}
                  savedLabel={t('pageProperties.saved')}
                  failureLabel={t('pageProperties.failed')}
                  retryLabel={t('pageProperties.retry')}
                  onRetry={() => runPropertyAction(handlers.onRetryProperties)}
                />
              </Box>
              {model.propertiesDirty && !model.propertiesSaving && !model.propertiesError ? (
                <Group>
                  <Text size="sm" c="dimmed" role="status">
                    {t('pageProperties.unsaved')}
                  </Text>
                  <Button
                    variant="default"
                    onClick={() => runPropertyAction(handlers.onSaveProperties)}
                  >
                    {t('pageProperties.save')}
                  </Button>
                </Group>
              ) : null}
              <SaveFeedback
                saving={false}
                saved={false}
                error={model.optionsError}
                savingLabel=""
                savedLabel=""
                failureLabel={t('pageProperties.loadFailed')}
                retryLabel={t('pageProperties.retryLoad')}
                onRetry={handlers.onRetryPropertyOptions}
              />
              <DocumentTitle
                disabled={editingDisabled}
                ref={titleRef}
                aria-label={t('ui.pageTitle')}
                value={page.title}
                onChange={handlers.Page_title_onChange2}
                onBlur={handlers.Page_title_onBlur3}
              />
              <Group gap="md" wrap="wrap" align="flex-end">
                <NativeSelect
                  disabled={editingDisabled || model.optionsLoading || Boolean(model.optionsError)}
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
                  disabled={editingDisabled || model.optionsLoading || Boolean(model.optionsError)}
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
                  disabled={editingDisabled}
                  type="date"
                  aria-label={t('ui.documentDate')}
                  label={t('ui.documentDate')}
                  value={page.date?.slice(0, 10) ?? ''}
                  onChange={handlers.Document_date_onChange6}
                  style={{ flex: 1, minWidth: 160 }}
                />
              </Group>
              <TextInput
                disabled={editingDisabled}
                aria-label={t('ui.tags')}
                label={t('ui.tags')}
                placeholder={t('ui.tagsCommaSeparated')}
                value={tagDraft}
                onChange={handlers.Tags_onChange7}
                onBlur={handlers.Tags_onBlur8}
              />
              <DocumentEditor documentKey={`pages/${slug}/body`} />
              <AIPanel kind="pages" id={slug} />
            </Stack>
            <ConfirmActionDialog
              opened={model.deleteOpened}
              pending={model.deletePending}
              confirmed={model.deleteConfirmed}
              title={t(model.deleteConfirmed ? 'pageDeletion.deleted' : 'pageDeletion.title')}
              description={t(
                model.deleteConfirmed
                  ? 'pageDeletion.deletedDescription'
                  : 'pageDeletion.description',
                { title: page.title },
              )}
              error={model.deleteError}
              confirmLabel={t(model.deleteConfirmed ? 'pageDeletion.openList' : 'ui.delete')}
              cancelLabel={t('common.cancel')}
              savingLabel={t(
                model.deleteConfirmed ? 'pageDeletion.opening' : 'pageDeletion.deleting',
              )}
              savedLabel={t('pageDeletion.deleted')}
              failureLabel={t(
                model.deleteConfirmed ? 'pageDeletion.openFailed' : 'pageDeletion.failed',
              )}
              retryLabel={t(model.deleteConfirmed ? 'pageDeletion.openList' : 'pageDeletion.retry')}
              onClose={handlers.onCloseDelete}
              onConfirm={handlers.onConfirmDelete}
            />
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
  const titleRef = useFocusWhen<HTMLTextAreaElement>(autofocusTitle, [model.slug]);
  return <PageDetailPageView model={{ ...model, handlers } as typeof model} titleRef={titleRef} />;
}
