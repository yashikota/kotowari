import { ActionIcon, Box, Group, TextInput } from '@mantine/core';
import { IconLayoutSidebarRight, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { IssueDisplayOptions } from './IssueDisplayOptions.tsx';
import { IssueFilterMenu } from './IssueFilterMenu.tsx';
import { AdvancedIssueFilterBuilder } from './AdvancedIssueFilterBuilder.tsx';
import { DEFAULT_DISPLAY_PROPERTIES } from '../issue-list.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueFiltersPresenter } from '../presenters/IssueFilters.tsx';

export function IssueFiltersView({
  model,
  leading,
  compactToolbar = false,
}: {
  model: ReturnType<typeof useIssueFiltersPresenter>;
  leading?: ReactNode;
  compactToolbar?: boolean;
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
        groupOptions,
        groupOrder,
        hiddenGroups,
        onGroupOrderChange,
        onGroupVisibilityChange,
        groupBy,
        layout,
        orderBy,
        subGroupBy,
        direction,
        completedIssues,
        completedByRecency,
        onCompletedByRecencyChange,
        showSubIssues,
        nestedSubIssues,
        showEmptyGroups,
        displayProperties,
        detailsOpen,
        onDetailsToggle,
        advancedFilter,
        advancedFilterGroup,
        advancedFilterChoices,
        onAdvancedFilterToggle,
        onAdvancedFilterChange,
        handlers,
      } = model;
      return (
        <Box
          w={compactToolbar ? '100%' : undefined}
          px={compactToolbar ? 0 : 'sm'}
          py={compactToolbar ? 0 : 6}
          style={
            compactToolbar
              ? undefined
              : { borderBottom: '1px solid var(--mantine-color-default-border)' }
          }
        >
          <Group
            role="search"
            aria-label={t('ui.issueFilters')}
            gap={4}
            wrap="nowrap"
            align="center"
          >
            {leading}
            <Group ml={compactToolbar ? 'auto' : undefined} gap={4} wrap="nowrap">
              <IssueFilterMenu
                search={search}
                projects={projects}
                cycles={cycles}
                labels={labels}
                linkSources={model.linkSources}
                selectedLabels={selectedLabels}
                selectedLinkSources={model.selectedLinkSources}
                templateOptions={model.templateOptions}
                selectedTemplateSlugs={model.selectedTemplateSlugs}
                selectedProjectLabels={selectedProjectLabels}
                selectedAddedToCycle={selectedAddedToCycle}
                opened={filterOpened}
                chips={chips}
                onOpenChange={handlers.onFilterOpenChange}
                onStatusChange={handlers.onStatusChange}
                onAssigneeChange={handlers.onAssigneeChange}
                onSubscribersChange={handlers.onSubscribersChange}
                onProjectChange={handlers.onProjectChange}
                onCycleChange={handlers.onCycleChange}
                onPriorityChange={handlers.onPriorityChange}
                onTypeChange={handlers.onTypeChange}
                onEstimateChange={handlers.onEstimateChange}
                onDueDateChange={handlers.onDueDateChange}
                onRelationChange={handlers.onRelationChange}
                onToggleLinkSource={handlers.onToggleLinkSource}
                onToggleTemplateSlug={handlers.onToggleTemplateSlug}
                onContentChange={handlers.onContentChange}
                onMilestoneNameChange={handlers.onMilestoneNameChange}
                onDateFieldChange={handlers.onDateFieldChange}
                onDateRangeChange={handlers.onDateRangeChange}
                onProjectStatusChange={handlers.onProjectStatusChange}
                onProjectPriorityChange={handlers.onProjectPriorityChange}
                onToggleLabel={handlers.onToggleLabel}
                onLabelOperatorChange={handlers.onLabelOperatorChange}
                onToggleProjectLabel={handlers.onToggleProjectLabel}
                onToggleAddedToCycle={handlers.onToggleAddedToCycle}
                onToggleAdvancedFilter={
                  onAdvancedFilterToggle ? handlers.onAdvancedFilterToggle : undefined
                }
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
            </Group>
            {model.onGroupBy && model.onLayout && model.onOrderBy ? (
              <Group ml={compactToolbar ? undefined : 'auto'} gap={2} wrap="nowrap">
                <IssueDisplayOptions
                  layout={layout ?? 'list'}
                  groupBy={groupBy ?? 'priority'}
                  orderBy={orderBy ?? 'manual'}
                  opened={displayOpened}
                  onToggle={handlers.onDisplayToggle}
                  onOpenChange={handlers.onDisplayOpenChange}
                  onLayoutChange={handlers.onLayoutChange}
                  onGroupByChange={handlers.onGroupByChange}
                  groupOptions={groupOptions}
                  groupOrder={groupOrder}
                  hiddenGroups={hiddenGroups}
                  onGroupOrderChange={onGroupOrderChange}
                  onGroupVisibilityChange={onGroupVisibilityChange}
                  onOrderByChange={handlers.onOrderByChange}
                  subGroupBy={subGroupBy ?? 'none'}
                  direction={direction ?? 'asc'}
                  completedIssues={completedIssues ?? 'all'}
                  completedByRecency={completedByRecency}
                  showSubIssues={showSubIssues ?? true}
                  nestedSubIssues={nestedSubIssues ?? 'showMatching'}
                  showEmptyGroups={showEmptyGroups ?? false}
                  displayProperties={displayProperties ?? [...DEFAULT_DISPLAY_PROPERTIES]}
                  onSubGroupByChange={handlers.onSubGroupByChange}
                  onDirectionChange={handlers.onDirectionChange}
                  onCompletedIssuesChange={handlers.onCompletedIssuesChange}
                  onCompletedByRecencyChange={
                    onCompletedByRecencyChange ? handlers.onCompletedByRecencyChange : undefined
                  }
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
          {onAdvancedFilterChange ? (
            <Box
              id="issue-advanced-filter-builder"
              mt="xs"
              p="xs"
              style={{
                borderTop: '1px solid var(--mantine-color-default-border)',
                display: advancedFilter ? undefined : 'none',
              }}
              aria-label={t('issueFilters.advancedFilter')}
            >
              <AdvancedIssueFilterBuilder
                group={advancedFilterGroup}
                choices={advancedFilterChoices}
                onChange={handlers.onAdvancedFilterChange}
              />
            </Box>
          ) : null}
        </Box>
      );
    }
  }
}

export function IssueFilters({
  leading,
  compactToolbar,
  ...props
}: Parameters<typeof useIssueFiltersPresenter>[0] & {
  leading?: ReactNode;
  compactToolbar?: boolean;
}) {
  return (
    <PresenterScope name="IssueFilters">
      <IssueFiltersBinding {...props} leading={leading} compactToolbar={compactToolbar} />
    </PresenterScope>
  );
}

function IssueFiltersBinding(
  props: Parameters<typeof useIssueFiltersPresenter>[0] & {
    leading?: ReactNode;
    compactToolbar?: boolean;
  },
) {
  const { leading, compactToolbar, ...presenterProps } = props;
  const model = useIssueFiltersPresenter(presenterProps);
  const handlers = useActions(model.handlers);
  return (
    <IssueFiltersView
      model={{ ...model, handlers } as typeof model}
      leading={leading}
      compactToolbar={compactToolbar}
    />
  );
}
