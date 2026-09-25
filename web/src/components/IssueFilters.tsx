import { ActionIcon, Box, Group, TextInput } from '@mantine/core';
import { IconLayoutSidebarRight, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { IssueDisplayOptions } from './IssueDisplayOptions.tsx';
import { IssueFilterMenu } from './IssueFilterMenu.tsx';
import { DEFAULT_DISPLAY_PROPERTIES } from '../issue-list.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueFiltersPresenter } from '../presenters/IssueFilters.tsx';

export function IssueFiltersView({
  model,
  leading,
}: {
  model: ReturnType<typeof useIssueFiltersPresenter>;
  leading?: ReactNode;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        search,
        projects,
        cycles,
        labels,
        find,
        onFind,
        findOpen,
        findRef,
        selectedLabels,
        selectedProjectLabels,
        selectedAddedToCycle,
        filterOpened,
        displayOpened,
        chips,
        groupBy,
        layout,
        orderBy,
        subGroupBy,
        direction,
        completedIssues,
        showSubIssues,
        nestedSubIssues,
        showEmptyGroups,
        displayProperties,
        detailsOpen,
        onDetailsToggle,
        handlers,
      } = model;
      return (
        <Box
          px="sm"
          py={6}
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group
            role="search"
            aria-label={t('ui.issueFilters')}
            gap={4}
            wrap="nowrap"
            align="center"
          >
            {leading}
            <IssueFilterMenu
              search={search}
              projects={projects}
              cycles={cycles}
              labels={labels}
              selectedLabels={selectedLabels}
              selectedProjectLabels={selectedProjectLabels}
              selectedAddedToCycle={selectedAddedToCycle}
              opened={filterOpened}
              chips={chips}
              onOpenChange={handlers.onFilterOpenChange}
              onStatusChange={handlers.onStatusChange}
              onAssigneeChange={handlers.onAssigneeChange}
              onProjectChange={handlers.onProjectChange}
              onCycleChange={handlers.onCycleChange}
              onPriorityChange={handlers.onPriorityChange}
              onTypeChange={handlers.onTypeChange}
              onEstimateChange={handlers.onEstimateChange}
              onDueDateChange={handlers.onDueDateChange}
              onRelationChange={handlers.onRelationChange}
              onContentChange={handlers.onContentChange}
              onMilestoneNameChange={handlers.onMilestoneNameChange}
              onDateFieldChange={handlers.onDateFieldChange}
              onDateRangeChange={handlers.onDateRangeChange}
              onProjectStatusChange={handlers.onProjectStatusChange}
              onProjectPriorityChange={handlers.onProjectPriorityChange}
              onToggleLabel={handlers.onToggleLabel}
              onToggleProjectLabel={handlers.onToggleProjectLabel}
              onToggleAddedToCycle={handlers.onToggleAddedToCycle}
              onRemoveFilter={handlers.onRemoveFilter}
              onClear={handlers.onClearFilters}
            />
            {onFind ? (
              <ActionIcon
                type="button"
                variant={findOpen ? 'light' : 'subtle'}
                color="gray"
                aria-label={t('ui.findIssues')}
                title={t('ui.findIssues')}
                aria-expanded={findOpen}
                onClick={handlers.onFindToggle}
              >
                <IconSearch size={16} stroke={1.7} aria-hidden="true" />
              </ActionIcon>
            ) : null}
            {onFind && findOpen ? (
              <TextInput
                ref={findRef}
                aria-label={t('ui.findIssues')}
                placeholder={t('ui.find')}
                value={find ?? ''}
                onChange={handlers.onFindChange}
                size="xs"
                w={190}
                styles={{ input: { height: 28, minHeight: 28, backgroundColor: 'transparent' } }}
              />
            ) : null}
            {model.onGroupBy && model.onLayout && model.onOrderBy ? (
              <Group ml="auto" gap={2} wrap="nowrap">
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
                  subGroupBy={subGroupBy ?? 'none'}
                  direction={direction ?? 'asc'}
                  completedIssues={completedIssues ?? 'all'}
                  showSubIssues={showSubIssues ?? true}
                  nestedSubIssues={nestedSubIssues ?? 'showMatching'}
                  showEmptyGroups={showEmptyGroups ?? false}
                  displayProperties={displayProperties ?? [...DEFAULT_DISPLAY_PROPERTIES]}
                  onSubGroupByChange={handlers.onSubGroupByChange}
                  onDirectionChange={handlers.onDirectionChange}
                  onCompletedIssuesChange={handlers.onCompletedIssuesChange}
                  onShowSubIssuesChange={handlers.onShowSubIssuesChange}
                  onNestedSubIssuesChange={handlers.onNestedSubIssuesChange}
                  onShowEmptyGroupsChange={handlers.onShowEmptyGroupsChange}
                  onDisplayPropertyToggle={handlers.onDisplayPropertyToggle}
                />
              </Group>
            ) : null}
            {onDetailsToggle ? (
              <ActionIcon
                type="button"
                variant={detailsOpen ? 'light' : 'subtle'}
                color="gray"
                aria-label={t(detailsOpen ? 'ui.closeDetails' : 'ui.openDetails')}
                title={t(detailsOpen ? 'ui.closeDetails' : 'ui.openDetails')}
                aria-pressed={detailsOpen}
                onClick={handlers.onDetailsToggle}
              >
                <IconLayoutSidebarRight size={16} stroke={1.7} aria-hidden="true" />
              </ActionIcon>
            ) : null}
          </Group>
        </Box>
      );
    }
  }
}

export function IssueFilters({
  leading,
  ...props
}: Parameters<typeof useIssueFiltersPresenter>[0] & { leading?: ReactNode }) {
  return (
    <PresenterScope name="IssueFilters">
      <IssueFiltersBinding {...props} leading={leading} />
    </PresenterScope>
  );
}

function IssueFiltersBinding(
  props: Parameters<typeof useIssueFiltersPresenter>[0] & { leading?: ReactNode },
) {
  const { leading, ...presenterProps } = props;
  const model = useIssueFiltersPresenter(presenterProps);
  const handlers = useActions(model.handlers);
  return <IssueFiltersView model={{ ...model, handlers } as typeof model} leading={leading} />;
}
