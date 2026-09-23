import { Box, Button, Group, Stack, TextInput } from '@mantine/core';

import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { useViewPagePresenter } from '../presenters/ViewsPages.tsx';

export function ViewPageView({
  model,
  viewNameRef,
}: {
  model: ReturnType<typeof useViewPagePresenter>;
  viewNameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  switch (model._view) {
    case 0: {
      const { data, issues, view, selected, search, find, groupBy, orderBy, handlers } = model;
      return (
        <Box
          h="100%"
          style={{
            minHeight: 0,
            overflow: view.display === 'board' ? 'auto' : 'hidden',
          }}
        >
          <SplitLayout single={view.display === 'board'}>
            <Pane single={view.display === 'board'}>
              <PageHeader
                title={view.name}
                actions={
                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      ref={viewNameRef}
                      aria-label="View name"
                      value={view.name}
                      onChange={handlers.View_name_onChange1}
                      onBlur={handlers.View_name_onBlur2}
                      size="xs"
                      w={180}
                    />
                    <Button type="button" variant="subtle" color="red" onClick={handlers.onClick0}>
                      Delete
                    </Button>
                  </Group>
                }
              />
              <Stack gap={0} style={{ minHeight: 0, flex: 1 }}>
                <IssueFilters
                  search={search}
                  projects={data.projects}
                  cycles={data.cycles}
                  labels={data.labels}
                  onChange={handlers.onFilterChange12}
                  find={find}
                  onFind={handlers.onFind13}
                  groupBy={groupBy}
                  onGroupBy={handlers.onGroupBy14}
                  layout={view.display}
                  onLayout={handlers.onLayout15}
                  orderBy={orderBy}
                  onOrderBy={handlers.onOrderBy16}
                />
                {view.display === 'board' ? (
                  <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {issues.length === 0 ? (
                      <EmptyState>No issues match this view.</EmptyState>
                    ) : (
                      <IssueBoard
                        issues={issues}
                        onOpen={handlers.onBoardOpen17}
                        onMove={handlers.onBoardMove18}
                        orderBy={orderBy}
                      />
                    )}
                  </Box>
                ) : issues.length === 0 ? (
                  <EmptyState>No issues match this view.</EmptyState>
                ) : (
                  <IssueList
                    issues={issues}
                    selectedId={selected}
                    onSelect={handlers.onSelect11}
                    groupBy={groupBy}
                    orderBy={orderBy}
                  />
                )}
              </Stack>
            </Pane>
            {view.display === 'list' ? (
              <Pane variant="detail">
                {selected ? (
                  <IssueDetail identifier={selected} />
                ) : (
                  <EmptyState>Select an issue</EmptyState>
                )}
              </Pane>
            ) : null}
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function ViewPage() {
  return (
    <PresenterScope name="ViewPage">
      <ViewPageBinding />
    </PresenterScope>
  );
}

function ViewPageBinding() {
  const model = useViewPagePresenter();
  const handlers = useActions(model.handlers);
  const autofocusName = useAutofocusTarget('name');
  const viewNameRef = useFocusWhen<HTMLInputElement>(autofocusName, [model.view.slug]);
  return <ViewPageView model={{ ...model, handlers } as typeof model} viewNameRef={viewNameRef} />;
}
