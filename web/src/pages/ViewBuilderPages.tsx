import { Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { ViewPreviewSummary } from '../components/ViewPreviewSummary.tsx';
import { ViewBuilderHeader } from '../components/ViewBuilderHeader.tsx';
import { ViewEntityTabs } from '../components/ViewEntityTabs.tsx';
import { EmptyState } from '../mantine-ui.tsx';
import { useFocusWhen } from '../focus.ts';
import { useViewBuilderPresenter } from '../presenters/ViewBuilderPages.tsx';

export function ViewBuilderPageView({
  model,
  nameRef,
}: {
  model: ReturnType<typeof useViewBuilderPresenter>;
  nameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0:
      return (
        <Box
          h="100%"
          style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        >
          <ViewBuilderHeader model={model} nameRef={nameRef} />
          <IssueFilters
            leading={<ViewEntityTabs active="issues" />}
            search={model.search}
            projects={model.data.projects}
            cycles={model.data.cycles}
            labels={model.data.labels}
            linkSources={model.data.linkSources}
            templateOptions={model.data.templateOptions}
            onChange={model.handlers.onSearchChange}
            groupBy={model.groupBy}
            onGroupBy={model.handlers.onGroupByChange}
            layout={model.display}
            onLayout={model.handlers.onDisplayChange}
            orderBy={model.orderBy}
            onOrderBy={model.handlers.onOrderByChange}
            subGroupBy={model.subGroupBy}
            onSubGroupBy={model.handlers.onSubGroupByChange}
            direction={model.direction}
            onDirection={model.handlers.onDirectionChange}
            completedIssues={model.completedIssues}
            onCompletedIssues={model.handlers.onCompletedIssuesChange}
            showSubIssues={model.showSubIssues}
            onShowSubIssues={model.handlers.onShowSubIssuesChange}
            nestedSubIssues={model.nestedSubIssues}
            onNestedSubIssues={model.handlers.onNestedSubIssuesChange}
            showEmptyGroups={model.showEmptyGroups}
            onShowEmptyGroups={model.handlers.onShowEmptyGroupsChange}
            displayProperties={model.displayProperties}
            onDisplayPropertyToggle={model.handlers.onDisplayPropertyToggle}
          />
          <ViewPreviewSummary
            titles={model.issues.map((issue) => `${issue.identifier}: ${issue.title}`)}
          />
          <Box
            inert
            aria-label={t('viewBuilder.preview')}
            aria-hidden="true"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
            }}
          >
            {model.issues.length === 0 ? (
              <EmptyState>{t('ui.noIssuesMatchView')}</EmptyState>
            ) : model.display === 'board' ? (
              <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <IssueBoard
                  issues={model.issues}
                  onOpen={() => undefined}
                  onMove={() => undefined}
                  orderBy={model.orderBy}
                  direction={model.direction}
                  showSubIssues={model.showSubIssues}
                />
              </Box>
            ) : (
              <IssueList
                issues={model.issues}
                selectedId={null}
                onSelect={() => undefined}
                groupBy={model.groupBy}
                subGroupBy={model.subGroupBy}
                orderBy={model.orderBy}
                direction={model.direction}
                showSubIssues={model.showSubIssues}
                showEmptyGroups={model.showEmptyGroups}
                displayProperties={model.displayProperties}
              />
            )}
          </Box>
        </Box>
      );
  }
}

export function ViewBuilderPage() {
  return (
    <PresenterScope name="ViewBuilderPage">
      <ViewBuilderPageBinding />
    </PresenterScope>
  );
}

function ViewBuilderPageBinding() {
  const model = useViewBuilderPresenter();
  const handlers = useActions(model.handlers);
  const nameRef = useFocusWhen<HTMLInputElement>(true, []);
  return <ViewBuilderPageView model={{ ...model, handlers } as typeof model} nameRef={nameRef} />;
}
