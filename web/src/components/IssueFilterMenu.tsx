import { useMemo, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Menu,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconCalendar,
  IconCalendarPlus,
  IconCalendarTime,
  IconBell,
  IconChartBar,
  IconChevronRight,
  IconCircleDot,
  IconFileText,
  IconFlag,
  IconFolder,
  IconFolderCog,
  IconFilter,
  IconLink,
  IconListCheck,
  IconRepeat,
  IconSearch,
  IconSparkles,
  IconTag,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { IssueSearch } from '../api.ts';
import type {
  Cycle,
  IssueLinkSource,
  IssueTemplateFilterOption,
  Label,
  Project,
} from '../types.ts';
import type { FilterChip } from '../issue-filter-chips.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { useProjectWorkflow } from '../project-workflow.tsx';
import { IssueFilterCategoryEditor } from './IssueFilterCategoryEditor.tsx';
import type { IssueFilterCategory } from './IssueFilterCategoryEditor.tsx';

const FILTER_CATEGORIES = [
  { id: 'status', group: 'issue', chips: ['status', 'statuses'] },
  { id: 'assignee', group: 'issue', chips: ['assignee'] },
  { id: 'subscribers', group: 'issue', chips: ['subscribers'] },
  { id: 'priority', group: 'issue', chips: ['priority', 'priorities'] },
  { id: 'estimate', group: 'issue', chips: ['estimate', 'estimates', 'noEstimate'] },
  { id: 'labels', group: 'issue', chips: ['label:'] },
  { id: 'relations', group: 'issue', chips: ['relation'] },
  { id: 'links', group: 'issue', chips: ['linkSource:'] },
  { id: 'template', group: 'issue', chips: ['template:'] },
  { id: 'dates', group: 'issue', chips: ['date'] },
  { id: 'project', group: 'planning', chips: ['project'] },
  {
    id: 'projectProperties',
    group: 'planning',
    chips: ['projectStatus', 'projectPriority', 'projectLabel:'],
  },
  { id: 'cycle', group: 'planning', chips: ['cycle'] },
  { id: 'addedToCycle', group: 'planning', chips: ['addedToCycle:'] },
  { id: 'content', group: 'other', chips: ['content'] },
  { id: 'type', group: 'other', chips: ['type'] },
  { id: 'dueDate', group: 'other', chips: ['dueDate'] },
  { id: 'milestone', group: 'other', chips: ['milestoneName'] },
] as const;

const FILTER_CATEGORY_ICONS = {
  status: IconCircleDot,
  assignee: IconUser,
  subscribers: IconBell,
  priority: IconFlag,
  estimate: IconChartBar,
  labels: IconTag,
  relations: IconLink,
  links: IconLink,
  template: IconFileText,
  dates: IconCalendar,
  project: IconFolder,
  projectProperties: IconFolderCog,
  cycle: IconRepeat,
  addedToCycle: IconCalendarPlus,
  content: IconFileText,
  type: IconListCheck,
  dueDate: IconCalendarTime,
  milestone: IconFlag,
} satisfies Record<IssueFilterCategory, typeof IconFilter>;

export function IssueFilterMenu({
  search,
  projects,
  cycles,
  labels,
  linkSources,
  templateOptions,
  selectedLabels,
  selectedLinkSources,
  selectedTemplateSlugs,
  selectedProjectLabels,
  selectedAddedToCycle,
  aiFilterOpen,
  aiFilterQuery,
  aiFilterError,
  aiFilterSuggestions,
  opened,
  chips,
  onOpenChange,
  onStatusChange,
  onAssigneeChange,
  onSubscribersChange,
  onProjectChange,
  onCycleChange,
  onPriorityChange,
  onTypeChange,
  onEstimateChange,
  onDueDateChange,
  onRelationChange,
  onToggleLinkSource,
  onToggleTemplateSlug,
  onContentChange,
  onMilestoneNameChange,
  onDateFieldChange,
  onDateRangeChange,
  onProjectStatusChange,
  onProjectPriorityChange,
  onToggleLabel,
  onLabelOperatorChange,
  onToggleProjectLabel,
  onToggleAddedToCycle,
  onAIFilterOpen,
  onAIFilterQueryChange,
  onAIFilterKeyDown,
  onAIFilterApply,
  onToggleAdvancedFilter,
  onRemoveFilter,
  onClear,
}: {
  search: IssueSearch;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  linkSources: IssueLinkSource[];
  templateOptions: IssueTemplateFilterOption[];
  selectedLabels: string[];
  selectedLinkSources: string[];
  selectedTemplateSlugs: string[];
  selectedProjectLabels: string[];
  selectedAddedToCycle: string[];
  aiFilterOpen: boolean;
  aiFilterQuery: string;
  aiFilterError: boolean;
  aiFilterSuggestions: { query: string }[];
  opened: boolean;
  chips: FilterChip[];
  onOpenChange: (next: boolean) => void;
  onStatusChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSubscribersChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onCycleChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onEstimateChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onRelationChange: (value: string) => void;
  onToggleLinkSource: (value: string) => void;
  onToggleTemplateSlug: (value: string) => void;
  onContentChange: (value: string) => void;
  onMilestoneNameChange: (value: string) => void;
  onDateFieldChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onProjectStatusChange: (value: string) => void;
  onProjectPriorityChange: (value: string) => void;
  onToggleLabel: (name: string) => void;
  onLabelOperatorChange: (value: string) => void;
  onToggleProjectLabel: (name: string) => void;
  onToggleAddedToCycle: (phase: 'planned' | 'during' | 'after') => void;
  onAIFilterOpen: () => void;
  onAIFilterQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAIFilterKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onAIFilterApply: (query?: string) => void;
  onToggleAdvancedFilter?: () => void;
  onRemoveFilter: (key: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const [filterQuery, setFilterQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<IssueFilterCategory | null>(null);
  const compact = useMediaQuery('(max-width: 640px)');
  const categoryLabels = useMemo(
    () =>
      Object.fromEntries(
        FILTER_CATEGORIES.map(({ id }) => [id, t(`filters.categories.${id}`)]),
      ) as Record<IssueFilterCategory, string>,
    [t],
  );
  const filteredCategories = FILTER_CATEGORIES.filter(({ id }) =>
    categoryLabels[id].toLocaleLowerCase().includes(filterQuery.trim().toLocaleLowerCase()),
  );
  const visibleGroups = (['issue', 'planning', 'other'] as const)
    .map((group) => ({
      group,
      categories: filteredCategories.filter((item) => item.group === group),
    }))
    .filter(({ categories }) => categories.length > 0);
  const activeFilterKeys = new Set(chips.map((chip) => chip.key));
  const categoryEditorData = {
    search,
    projects,
    cycles,
    labels,
    linkSources,
    templateOptions,
    workflowStatuses,
    projectWorkflowStatuses,
    selectedLabels,
    selectedLinkSources,
    selectedTemplateSlugs,
    selectedProjectLabels,
    selectedAddedToCycle,
  };
  const categoryEditorHandlers = {
    onStatusChange,
    onAssigneeChange,
    onSubscribersChange,
    onProjectChange,
    onCycleChange,
    onPriorityChange,
    onTypeChange,
    onEstimateChange,
    onDueDateChange,
    onRelationChange,
    onToggleLinkSource,
    onToggleTemplateSlug,
    onContentChange,
    onMilestoneNameChange,
    onDateFieldChange,
    onDateRangeChange,
    onProjectStatusChange,
    onProjectPriorityChange,
    onToggleLabel,
    onToggleProjectLabel,
    onToggleAddedToCycle,
  };

  function isCategoryActive(filterCategory: IssueFilterCategory): boolean {
    const definition = FILTER_CATEGORIES.find(({ id }) => id === filterCategory);
    return (
      definition?.chips.some((key) =>
        key.endsWith(':')
          ? [...activeFilterKeys].some((activeKey) => activeKey.startsWith(key))
          : activeFilterKeys.has(key),
      ) ?? false
    );
  }

  return (
    <>
      <Menu
        opened={opened}
        onChange={(next) => {
          onOpenChange(next);
          if (!next) {
            setFilterQuery('');
            setOpenCategory(null);
          }
        }}
        position="bottom-start"
        shadow="md"
        withinPortal
        closeOnItemClick={false}
        withInitialFocusPlaceholder={false}
      >
        <Menu.Target>
          <ActionIcon
            type="button"
            variant={chips.length > 0 ? 'light' : 'subtle'}
            color="gray"
            aria-label={t('filters.button')}
            title={t('filters.button')}
            aria-expanded={opened}
          >
            <IconFilter size={16} stroke={1.7} aria-hidden="true" />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown
          aria-label={t('filters.button')}
          p={0}
          mah="80vh"
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape' && openCategory) {
              event.preventDefault();
              event.stopPropagation();
              setOpenCategory(null);
            }
          }}
          style={{ width: 240, maxWidth: 'calc(100vw - 16px)', overflow: 'visible' }}
        >
          <Stack w="100%" gap={0}>
            {aiFilterOpen ? (
              <TextInput
                aria-label={t('issueFilters.aiInput')}
                placeholder={t('issueFilters.aiInput')}
                leftSection={<IconSparkles size={15} aria-hidden="true" />}
                value={aiFilterQuery}
                autoFocus
                onChange={onAIFilterQueryChange}
                onKeyDown={onAIFilterKeyDown}
                styles={{ input: { border: 0, borderRadius: 0 } }}
              />
            ) : (
              <TextInput
                aria-label={t('filters.searchFilters')}
                placeholder={t('filters.searchPlaceholder')}
                leftSection={<IconSearch size={15} aria-hidden="true" />}
                value={filterQuery}
                autoFocus
                onFocus={() => setOpenCategory(null)}
                onChange={(event) => setFilterQuery(event.currentTarget.value)}
                styles={{ input: { border: 0, borderRadius: 0 } }}
              />
            )}
            <Divider />
            {aiFilterOpen ? (
              <Stack gap="xs" p="xs" mah="calc(80vh - 42px)" style={{ overflowY: 'auto' }}>
                <Stack gap={2} role="listbox" aria-label={t('issueFilters.aiSuggestions')}>
                  {aiFilterSuggestions.map(({ query }) => (
                    <Button
                      key={query}
                      type="button"
                      size="compact-sm"
                      variant="subtle"
                      color="gray"
                      role="option"
                      fullWidth
                      justify="flex-start"
                      leftSection={<IconSparkles size={14} stroke={1.7} aria-hidden="true" />}
                      onClick={() => onAIFilterApply(query)}
                    >
                      {query}
                    </Button>
                  ))}
                </Stack>
                {aiFilterError ? (
                  <Text size="xs" c="dimmed" px="xs" role="alert">
                    {t('issueFilters.aiUnsupported')}
                  </Text>
                ) : null}
              </Stack>
            ) : (
              <Stack gap="xs" p="xs" mah="calc(80vh - 42px)" style={{ overflowY: 'auto' }}>
                <Menu.Item
                  leftSection={<IconSparkles size={15} stroke={1.7} aria-hidden="true" />}
                  closeMenuOnClick={false}
                  onClick={() => {
                    setOpenCategory(null);
                    onAIFilterOpen();
                  }}
                >
                  {t('issueFilters.aiFilter')}
                </Menu.Item>
                <Divider my={4} />
                {onToggleAdvancedFilter ? (
                  <>
                    <Menu.Item
                      leftSection={<IconFilter size={15} stroke={1.7} aria-hidden="true" />}
                      aria-pressed={Boolean(search.advancedFilter)}
                      onClick={() => {
                        onToggleAdvancedFilter();
                        onOpenChange(false);
                      }}
                    >
                      {t('issueFilters.advancedFilter')}
                    </Menu.Item>
                    <Divider my={4} />
                  </>
                ) : null}
                {visibleGroups.map(({ categories: groupCategories, group }, groupIndex) => (
                  <Stack key={group} gap={2}>
                    {groupIndex > 0 ? <Divider my={4} /> : null}
                    {groupCategories.map(({ id }) => {
                      const CategoryIcon = FILTER_CATEGORY_ICONS[id];
                      return (
                        <Popover
                          key={id}
                          opened={openCategory === id}
                          onChange={(next) => {
                            if (!next) setOpenCategory(null);
                          }}
                          position={compact ? 'bottom-start' : 'right-start'}
                          offset={4}
                          withinPortal={false}
                          closeOnClickOutside={false}
                          shadow="md"
                        >
                          <Popover.Target popupType="menu">
                            <Menu.Item
                              leftSection={
                                <CategoryIcon size={15} stroke={1.7} aria-hidden="true" />
                              }
                              rightSection={<IconChevronRight size={14} aria-hidden="true" />}
                              aria-pressed={isCategoryActive(id)}
                              aria-expanded={openCategory === id}
                              aria-haspopup="menu"
                              closeMenuOnClick={false}
                              onMouseEnter={() => setOpenCategory(id)}
                              onClick={() => setOpenCategory(id)}
                              onKeyDown={(event) => {
                                if (event.key === 'ArrowRight') {
                                  event.preventDefault();
                                  setOpenCategory(id);
                                }
                              }}
                            >
                              {categoryLabels[id]}
                            </Menu.Item>
                          </Popover.Target>
                          <Popover.Dropdown
                            role="menu"
                            aria-label={categoryLabels[id]}
                            p={0}
                            style={{
                              width: compact ? 320 : 220,
                              maxWidth: 'calc(100vw - 16px)',
                              overflow: 'hidden',
                            }}
                          >
                            <Stack
                              gap="sm"
                              p="sm"
                              mah="min(80vh, 440px)"
                              style={{ overflowY: 'auto' }}
                            >
                              {isCategoryActive(id) ? (
                                <Button
                                  type="button"
                                  size="compact-xs"
                                  variant="subtle"
                                  onClick={() => {
                                    const definition = FILTER_CATEGORIES.find(
                                      (filter) => filter.id === id,
                                    );
                                    if (!definition) return;
                                    for (const chip of chips) {
                                      if (
                                        definition.chips.some((key) =>
                                          key.endsWith(':')
                                            ? chip.key.startsWith(key)
                                            : chip.key === key,
                                        )
                                      ) {
                                        onRemoveFilter(chip.key);
                                      }
                                    }
                                    setOpenCategory(null);
                                  }}
                                >
                                  {t('filters.clearFilter')}
                                </Button>
                              ) : null}
                              <IssueFilterCategoryEditor
                                category={id}
                                data={categoryEditorData}
                                handlers={categoryEditorHandlers}
                              />
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      );
                    })}
                  </Stack>
                ))}
                {filteredCategories.length === 0 ? (
                  <Text size="sm" c="dimmed" px="xs" py="sm">
                    {t('filters.noMatchingFilters')}
                  </Text>
                ) : null}
                {chips.length > 0 ? (
                  <>
                    <Divider my={4} />
                    <Button
                      type="button"
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      onClick={onClear}
                    >
                      {t('filters.clear')}
                    </Button>
                  </>
                ) : null}
              </Stack>
            )}
          </Stack>
        </Menu.Dropdown>
      </Menu>
      {chips.length > 0 ? (
        <Group role="group" aria-label={t('filters.active')} gap={4} mt={6}>
          {selectedLabels.length > 0 ? (
            <Select
              aria-label={t('filters.labelOperator')}
              size="xs"
              w={160}
              value={
                search.labelOperator ?? (selectedLabels.length > 1 ? 'includeAll' : 'includeAny')
              }
              data={(['includeAny', 'includeAll', 'excludeAny', 'excludeAll'] as const).map(
                (value) => ({ value, label: t(`filters.labelOperatorValue.${value}`) }),
              )}
              onChange={(value) => {
                if (value) onLabelOperatorChange(value);
              }}
            />
          ) : null}
          {chips.map((chip) => (
            <Button
              key={chip.key}
              type="button"
              size="compact-xs"
              variant="light"
              aria-label={t('filters.remove', { label: chip.label })}
              onClick={() => {
                setOpenCategory(null);
                onRemoveFilter(chip.key);
              }}
            >
              {chip.label} ×
            </Button>
          ))}
        </Group>
      ) : null}
    </>
  );
}
