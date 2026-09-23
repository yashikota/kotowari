import { Box, Group, Stack, TextInput, Textarea } from '@mantine/core';
import { IssueDisplayOptions } from './IssueDisplayOptions.tsx';
import { IssueFilterMenu } from './IssueFilterMenu.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueFiltersPresenter } from '../presenters/IssueFilters.tsx';

export function IssueFiltersView({
  model,
}: {
  model: ReturnType<typeof useIssueFiltersPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const {
        search,
        projects,
        cycles,
        labels,
        onSaveView,
        find,
        onFind,
        viewName,
        findRef,
        selectedLabels,
        filterOpened,
        displayOpened,
        chips,
        groupBy,
        layout,
        orderBy,
        handlers,
      } = model;
      return (
        <Box
          px="sm"
          pb="xs"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group role="search" aria-label="Issue filters" gap={6} wrap="wrap" align="flex-start">
            <IssueFilterMenu
              search={search}
              projects={projects}
              cycles={cycles}
              labels={labels}
              selectedLabels={selectedLabels}
              opened={filterOpened}
              chips={chips}
              onToggle={handlers.onFilterToggle}
              onOpenChange={handlers.onFilterOpenChange}
              onStatusChange={handlers.onStatusChange}
              onProjectChange={handlers.onProjectChange}
              onCycleChange={handlers.onCycleChange}
              onPriorityChange={handlers.onPriorityChange}
              onToggleLabel={handlers.onToggleLabel}
              onRemoveFilter={handlers.onRemoveFilter}
              onClear={handlers.onClearFilters}
            />
            {onFind ? (
              <TextInput
                ref={findRef}
                aria-label="Find issues"
                placeholder="Find…"
                value={find ?? ''}
                onChange={handlers.onFindChange}
                size="xs"
                w={180}
                styles={{ input: { height: 28, minHeight: 28, backgroundColor: 'transparent' } }}
              />
            ) : null}
            {model.onGroupBy && model.onLayout && model.onOrderBy ? (
              <Stack ml="auto">
                <IssueDisplayOptions
                  layout={layout ?? 'list'}
                  groupBy={groupBy ?? 'priority'}
                  orderBy={orderBy ?? 'manual'}
                  opened={displayOpened}
                  onToggle={handlers.onDisplayToggle}
                  onOpenChange={handlers.onDisplayOpenChange}
                  onLayoutChange={handlers.onLayoutChange}
                  onGroupByChange={handlers.onGroupByChange}
                  onOrderByChange={handlers.onOrderByChange}
                />
              </Stack>
            ) : null}
          </Group>
          {onSaveView ? (
            <Box component="form" mt={6} onSubmit={handlers.onSubmitView}>
              <Textarea
                rows={2}
                aria-label="New view name"
                placeholder="Save as view"
                value={viewName}
                onChange={handlers.onViewNameChange}
                size="xs"
                autosize
                minRows={1}
              />
            </Box>
          ) : null}
        </Box>
      );
    }
  }
}

export function IssueFilters(props: Parameters<typeof useIssueFiltersPresenter>[0]) {
  return (
    <PresenterScope name="IssueFilters">
      <IssueFiltersBinding {...props} />
    </PresenterScope>
  );
}

function IssueFiltersBinding(props: Parameters<typeof useIssueFiltersPresenter>[0]) {
  const model = useIssueFiltersPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueFiltersView model={{ ...model, handlers } as typeof model} />;
}
