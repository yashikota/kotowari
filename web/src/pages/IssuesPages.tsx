import { Alert, Box, Button, Group, Modal, Stack, TextInput, VisuallyHidden } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueViewTabs } from '../components/IssueViewTabs.tsx';
import { IssueListFacetPanel } from '../components/IssueListFacetPanel.tsx';
import { EmptyState, PageHeader, Pane, Shortcut, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import {
  useBoardPagePresenter,
  useIssueRoutePagePresenter,
  useIssuesPagePresenter,
} from '../presenters/IssuesPages.tsx';

export function IssuesPageView({ model }: { model: ReturnType<typeof useIssuesPagePresenter> }) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        data,
        search,
        find,
        issues,
        restoreScrollTop,
        selected,
        view,
        groupBy,
        layout,
        orderBy,
        subGroupBy,
        direction,
        completedIssues,
        newViewOpen,
        newViewName,
        newViewSaving,
        newViewError,
        showSubIssues,
        nestedSubIssues,
        showEmptyGroups,
        displayProperties,
        detailsOpen,
        facet,
        facetOptions,
        selectedFacetValues,
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <VisuallyHidden>
            <h2>{t('nav.issues')}</h2>
          </VisuallyHidden>
          <IssueViewTabs
            value={view}
            onChange={handlers.onView4}
            onAddNewView={handlers.onNewViewOpen}
          />
          <Modal
            opened={newViewOpen}
            onClose={handlers.onNewViewClose}
            title={t('modal.createView')}
            centered
            autoFocus={false}
          >
            <Box component="form" onSubmit={handlers.onNewViewSubmit}>
              <Stack gap="md">
                <TextInput
                  autoFocus
                  aria-label={t('modal.viewName')}
                  placeholder={t('modal.viewName')}
                  value={newViewName}
                  onChange={handlers.onNewViewNameChange}
                  maxLength={100}
                />
                {newViewError ? <Alert color="red">{newViewError}</Alert> : null}
                <Group justify="flex-end" gap="xs">
                  <Button type="button" variant="default" onClick={handlers.onNewViewClose}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" loading={newViewSaving} disabled={!newViewName.trim()}>
                    {t('modal.create')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
          <Box style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <IssueFilters
              search={search}
              projects={data.projects}
              cycles={data.cycles}
              labels={data.labels}
              onChange={handlers.onChange0}
              find={find}
              onFind={handlers.onFind2}
              groupBy={groupBy}
              onGroupBy={handlers.onGroupBy5}
              layout={layout}
              onLayout={handlers.onLayout6}
              orderBy={orderBy}
              onOrderBy={handlers.onOrderBy7}
              subGroupBy={subGroupBy}
              onSubGroupBy={handlers.onSubGroupBy17}
              direction={direction}
              onDirection={handlers.onDirection18}
              completedIssues={completedIssues}
              onCompletedIssues={handlers.onCompletedIssues19}
              showSubIssues={showSubIssues}
              onShowSubIssues={handlers.onShowSubIssues20}
              nestedSubIssues={nestedSubIssues}
              onNestedSubIssues={handlers.onNestedSubIssues21}
              showEmptyGroups={showEmptyGroups}
              onShowEmptyGroups={handlers.onShowEmptyGroups22}
              displayProperties={displayProperties}
              onDisplayPropertyToggle={handlers.onDisplayPropertyToggle23}
              detailsOpen={detailsOpen}
              onDetailsToggle={handlers.onDetailsToggle}
            />
            <Group
              align="stretch"
              gap={0}
              wrap="nowrap"
              style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <Box
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {layout === 'list' ? (
                  <IssueList
                    issues={issues}
                    selectedId={selected}
                    onSelect={handlers.onSelect3}
                    find={find}
                    restoreScrollTop={restoreScrollTop}
                    groupBy={groupBy}
                    orderBy={orderBy}
                    subGroupBy={subGroupBy}
                    direction={direction}
                    showEmptyGroups={showEmptyGroups}
                    showSubIssues={showSubIssues}
                    displayProperties={displayProperties}
                  />
                ) : (
                  <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {issues.length === 0 ? (
                      <EmptyState>{t('ui.noIssuesMatchFilters')}</EmptyState>
                    ) : (
                      <IssueBoard
                        issues={issues}
                        onOpen={handlers.onBoardOpen8}
                        onMove={handlers.onBoardMove9}
                        find={find}
                        orderBy={orderBy}
                        direction={direction}
                        showSubIssues={showSubIssues}
                      />
                    )}
                  </Box>
                )}
              </Box>
              {detailsOpen ? (
                <IssueListFacetPanel
                  facet={facet}
                  options={facetOptions}
                  selectedValues={selectedFacetValues}
                  onFacetChange={handlers.onFacetChange}
                  onToggle={handlers.onFacetFilterToggle}
                />
              ) : null}
            </Group>
          </Box>
        </Box>
      );
    }
  }
}

export function IssuesPage() {
  return (
    <PresenterScope name="IssuesPage">
      <IssuesPageBinding />
    </PresenterScope>
  );
}

function IssuesPageBinding() {
  const model = useIssuesPagePresenter();
  const handlers = useActions(model.handlers);
  return <IssuesPageView model={{ ...model, handlers } as typeof model} />;
}

export function IssueRoutePageView({
  model,
}: {
  model: ReturnType<typeof useIssueRoutePagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const {
        identifier,
        navigationIds,
        issueReturnTo,
        issueListFind,
        issueListSelectedId,
        issueListScrollTop,
        issueListLayout,
      } = model;
      return (
        <Box h="100%" style={{ overflow: 'auto' }}>
          <IssueDetail
            identifier={identifier}
            navigationIds={navigationIds}
            issueReturnTo={issueReturnTo}
            issueListFind={issueListFind}
            issueListSelectedId={issueListSelectedId}
            issueListScrollTop={issueListScrollTop}
            issueListLayout={issueListLayout}
          />
        </Box>
      );
    }
  }
}

export function IssueRoutePage() {
  return (
    <PresenterScope name="IssueRoutePage">
      <IssueRoutePageBinding />
    </PresenterScope>
  );
}

function IssueRoutePageBinding() {
  const model = useIssueRoutePagePresenter();
  const handlers = useActions(model.handlers);
  return <IssueRoutePageView model={{ ...model, handlers } as typeof model} />;
}

export function BoardPageView({ model }: { model: ReturnType<typeof useBoardPagePresenter> }) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { data, search, find, issues, handlers } = model;
      return (
        <Box h="100%" style={{ overflow: 'hidden' }}>
          <SplitLayout single>
            <Pane single>
              <PageHeader title={t('nav.board')} />
              <IssueFilters
                search={search}
                projects={data.projects}
                cycles={data.cycles}
                labels={data.labels}
                onChange={handlers.onChange0}
                find={find}
                onFind={handlers.onFind2}
              />
              {issues.length === 0 ? (
                <EmptyState>
                  {t('ui.noIssuesStart')} <Shortcut>c</Shortcut> {t('ui.toCreate')}
                </EmptyState>
              ) : (
                <IssueBoard
                  issues={issues}
                  onOpen={handlers.onOpen3}
                  onMove={handlers.onMove4}
                  find={find}
                />
              )}
            </Pane>
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function BoardPage() {
  return (
    <PresenterScope name="BoardPage">
      <BoardPageBinding />
    </PresenterScope>
  );
}

function BoardPageBinding() {
  const model = useBoardPagePresenter();
  const handlers = useActions(model.handlers);
  return <BoardPageView model={{ ...model, handlers } as typeof model} />;
}
