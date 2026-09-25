import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Box,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import {
  IconBook,
  IconCheck,
  IconChevronDown,
  IconFileText,
  IconFilter,
  IconLayoutList,
  IconScale,
  IconSearch,
  IconStack2,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { SearchDateTimeframeDialog } from '../components/SearchDateTimeframeDialog.tsx';
import { useFocusWhen } from '../focus.ts';
import { SEARCH_DATE_WINDOWS } from '../search.ts';
import { ISSUE_STATUSES, type SearchHit } from '../types.ts';
import { useSearchPagePresenter } from '../presenters/SearchPages.tsx';
import styles from './SearchPages.module.css';

function SearchResultLink({ hit, children }: { hit: SearchHit; children: ReactNode }) {
  switch (hit.kind) {
    case 'issue':
      return (
        <Link to="/issues/$identifier" params={{ identifier: hit.id }} className={styles.result}>
          {children}
        </Link>
      );
    case 'project':
      return (
        <Link to="/projects/$slug" params={{ slug: hit.id }} className={styles.result}>
          {children}
        </Link>
      );
    case 'page':
      return (
        <Link to="/pages/$slug" params={{ slug: hit.id }} className={styles.result}>
          {children}
        </Link>
      );
    case 'adr':
      return (
        <Link to="/adrs/$identifier" params={{ identifier: hit.id }} className={styles.result}>
          {children}
        </Link>
      );
    case 'view':
      return (
        <Link to="/views/$slug" params={{ slug: hit.id }} className={styles.result}>
          {children}
        </Link>
      );
  }
}

function SearchKindIcon({ kind }: { kind: SearchHit['kind'] }) {
  switch (kind) {
    case 'issue':
      return <IconLayoutList size={15} stroke={1.7} aria-hidden />;
    case 'project':
      return <IconStack2 size={15} stroke={1.7} aria-hidden />;
    case 'page':
      return <IconBook size={15} stroke={1.7} aria-hidden />;
    case 'adr':
      return <IconScale size={15} stroke={1.7} aria-hidden />;
    case 'view':
      return <IconFileText size={15} stroke={1.7} aria-hidden />;
  }
}

function SearchPageView({
  model,
  searchRef,
}: {
  model: ReturnType<typeof useSearchPagePresenter>;
  searchRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        query,
        submittedQuery,
        tab,
        order,
        includeArchived,
        statuses,
        dates,
        customDateField,
        customDateInput,
        customDateGranularity,
        hasFilters,
        hits,
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <VisuallyHidden>
            <h1>{t('searchPage.heading')}</h1>
          </VisuallyHidden>
          <Box className={styles.toolbar}>
            <Box className={styles.content}>
              <form onSubmit={handlers.onSubmit} role="search">
                <TextInput
                  ref={searchRef}
                  size="md"
                  leftSection={<IconSearch size={17} stroke={1.7} aria-hidden />}
                  rightSection={
                    query ? (
                      <ActionIcon
                        type="button"
                        variant="subtle"
                        color="gray"
                        size="sm"
                        aria-label={t('searchPage.clear')}
                        onClick={handlers.onClear}
                      >
                        <IconX size={15} aria-hidden />
                      </ActionIcon>
                    ) : null
                  }
                  aria-label={t('searchPage.inputLabel')}
                  placeholder={t('searchPage.placeholder')}
                  value={query}
                  maxLength={200}
                  onChange={(event) => handlers.onQueryChange(event.currentTarget.value)}
                />
              </form>
              <Group justify="space-between" align="center" gap="sm" mt="md" wrap="nowrap">
                <Tabs
                  value={tab}
                  onChange={handlers.onTabChange}
                  variant="default"
                  keepMounted={false}
                  className={styles.tabs}
                  styles={{ list: { borderBottom: 0, gap: 12 } }}
                >
                  <Tabs.List aria-label={t('searchPage.categories')}>
                    <Tabs.Tab value="all">{t('searchPage.tabs.all')}</Tabs.Tab>
                    <Tabs.Tab value="issues">{t('searchPage.tabs.issues')}</Tabs.Tab>
                    <Tabs.Tab value="projects">{t('searchPage.tabs.projects')}</Tabs.Tab>
                    <Tabs.Tab value="documents">{t('searchPage.tabs.documents')}</Tabs.Tab>
                  </Tabs.List>
                </Tabs>
                <Group gap={6} wrap="nowrap">
                  <Menu position="bottom-end" withinPortal shadow="md">
                    <Menu.Target>
                      <UnstyledButton
                        type="button"
                        className={styles.displayOptions}
                        aria-label={t('searchPage.addFilter')}
                      >
                        <IconFilter size={14} stroke={1.7} aria-hidden />
                        <span>{t('searchPage.addFilter')}</span>
                        <IconChevronDown size={13} stroke={1.8} aria-hidden />
                      </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown aria-label={t('searchPage.addFilter')}>
                      <Menu.Label>{t('searchPage.filters.status')}</Menu.Label>
                      {ISSUE_STATUSES.map((status) => (
                        <Menu.CheckboxItem
                          key={status}
                          checked={statuses.includes(status)}
                          onChange={() => handlers.onToggleStatus(status)}
                        >
                          {t(`issueStatus.${status}`)}
                        </Menu.CheckboxItem>
                      ))}
                      <Menu.Divider />
                      {(['created', 'updated'] as const).map((field) => (
                        <Menu.Sub key={field}>
                          <Menu.Sub.Target>
                            <Menu.Sub.Item>{t(`searchPage.filters.${field}Date`)}</Menu.Sub.Item>
                          </Menu.Sub.Target>
                          <Menu.Sub.Dropdown>
                            <Menu.Label>{t(`searchPage.filters.${field}Date`)}</Menu.Label>
                            <Menu.Item
                              leftSection={
                                !dates[field] ? <IconCheck size={14} aria-hidden /> : null
                              }
                              onClick={() => handlers.onDateFilterChange(field, undefined)}
                            >
                              {t('searchPage.filters.anyTime')}
                            </Menu.Item>
                            {SEARCH_DATE_WINDOWS.map((window) => (
                              <Menu.Item
                                key={window}
                                leftSection={
                                  dates[field]?.operator === 'after' &&
                                  dates[field].value.kind === 'relative' &&
                                  dates[field].value.window === window ? (
                                    <IconCheck size={14} aria-hidden />
                                  ) : null
                                }
                                onClick={() =>
                                  handlers.onDateFilterChange(field, {
                                    operator: 'after',
                                    value: { kind: 'relative', window },
                                  })
                                }
                              >
                                {t(`searchPage.filters.dateWindows.${window}`)}
                              </Menu.Item>
                            ))}
                            <Menu.Divider />
                            <Menu.Item onClick={() => handlers.onOpenCustomDate(field)}>
                              {t('searchPage.filters.customTimeframe')}
                            </Menu.Item>
                          </Menu.Sub.Dropdown>
                        </Menu.Sub>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                  <Menu position="bottom-end" withinPortal shadow="md">
                    <Menu.Target>
                      <UnstyledButton
                        type="button"
                        className={styles.displayOptions}
                        aria-label={t('searchPage.displayOptions')}
                      >
                        <IconFileText size={14} stroke={1.7} aria-hidden />
                        <span>{t('searchPage.displayOptions')}</span>
                        <IconChevronDown size={13} stroke={1.8} aria-hidden />
                      </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown aria-label={t('searchPage.displayOptions')}>
                      <Menu.Label>{t('searchPage.ordering')}</Menu.Label>
                      <Menu.Item
                        aria-checked={order === 'relevance'}
                        leftSection={
                          order === 'relevance' ? <IconCheck size={14} aria-hidden /> : null
                        }
                        onClick={() => handlers.onOrderChange('relevance')}
                      >
                        {t('searchPage.mostRelevant')}
                      </Menu.Item>
                      {(['updatedAt', 'createdAt'] as const).map((ordering) => (
                        <Menu.Item
                          key={ordering}
                          aria-checked={order === ordering}
                          leftSection={
                            order === ordering ? <IconCheck size={14} aria-hidden /> : null
                          }
                          onClick={() => handlers.onOrderChange(ordering)}
                        >
                          {t(
                            `searchPage.${ordering === 'updatedAt' ? 'lastUpdated' : 'lastCreated'}`,
                          )}
                        </Menu.Item>
                      ))}
                      <Menu.Divider />
                      <Menu.CheckboxItem
                        checked={includeArchived}
                        onChange={() => handlers.onIncludeArchivedChange(!includeArchived)}
                      >
                        {t('searchPage.includeArchived')}
                      </Menu.CheckboxItem>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
              {hasFilters ? (
                <Group
                  gap={6}
                  mt="sm"
                  wrap="wrap"
                  role="group"
                  aria-label={t('searchPage.filters.active')}
                >
                  {statuses.map((status) => (
                    <UnstyledButton
                      key={status}
                      type="button"
                      className={styles.filterChip}
                      aria-label={t('searchPage.filters.removeStatus', {
                        status: t(`issueStatus.${status}`),
                      })}
                      onClick={() => handlers.onToggleStatus(status)}
                    >
                      {t('searchPage.filters.statusValue', {
                        status: t(`issueStatus.${status}`),
                      })}
                      <IconX size={12} aria-hidden />
                    </UnstyledButton>
                  ))}
                  {(['created', 'updated'] as const).map((field) => {
                    const filter = dates[field];
                    if (!filter) return null;
                    const fieldLabel = t(`searchPage.filters.${field}Date`);
                    const dateLabel =
                      filter.value.kind === 'relative'
                        ? t(`searchPage.filters.dateWindows.${filter.value.window}`)
                        : filter.value.start === filter.value.end
                          ? filter.value.start
                          : `${filter.value.start} – ${filter.value.end}`;
                    return (
                      <Group
                        key={field}
                        gap={5}
                        wrap="nowrap"
                        className={styles.filterChip}
                        role="group"
                        aria-label={t('searchPage.filters.activeDate', {
                          field: fieldLabel,
                          operator: t(`searchPage.filters.operators.${filter.operator}`),
                          date: dateLabel,
                        })}
                      >
                        <Text component="span" size="xs">
                          {fieldLabel}
                        </Text>
                        {filter.value.kind === 'relative' ? (
                          <Menu position="bottom-start" withinPortal shadow="md">
                            <Menu.Target>
                              <UnstyledButton
                                type="button"
                                className={styles.filterOperator}
                                aria-label={t('searchPage.filters.changeDateOperator', {
                                  field: fieldLabel,
                                })}
                              >
                                {t(`searchPage.filters.operators.${filter.operator}`)}
                              </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {(['after', 'before'] as const).map((operator) => (
                                <Menu.Item
                                  key={operator}
                                  aria-checked={filter.operator === operator}
                                  leftSection={
                                    filter.operator === operator ? (
                                      <IconCheck size={14} aria-hidden />
                                    ) : null
                                  }
                                  onClick={() => handlers.onDateOperatorChange(field, operator)}
                                >
                                  {t(`searchPage.filters.operators.${operator}`)}
                                </Menu.Item>
                              ))}
                            </Menu.Dropdown>
                          </Menu>
                        ) : (
                          <Text component="span" size="xs">
                            {t(`searchPage.filters.operators.${filter.operator}`)}
                          </Text>
                        )}
                        <Text component="span" size="xs">
                          {dateLabel}
                        </Text>
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          color="gray"
                          size="xs"
                          aria-label={t('searchPage.filters.removeDate', {
                            field: fieldLabel,
                            date: dateLabel,
                          })}
                          onClick={() => handlers.onDateFilterChange(field, undefined)}
                        >
                          <IconX size={12} aria-hidden />
                        </ActionIcon>
                      </Group>
                    );
                  })}
                  <UnstyledButton
                    type="button"
                    className={styles.clearFilters}
                    onClick={handlers.onClearFilters}
                  >
                    {t('searchPage.filters.clear')}
                  </UnstyledButton>
                </Group>
              ) : null}
            </Box>
          </Box>
          <ScrollArea className={styles.scroll} type="auto">
            <Box className={styles.content} py="md">
              {submittedQuery ? (
                hits.length ? (
                  <Stack gap={2} role="list" aria-label={t('searchPage.results')}>
                    {hits.map((hit) => (
                      <Box key={`${hit.kind}:${hit.id}`} role="listitem">
                        <SearchResultLink hit={hit}>
                          <Group gap="sm" wrap="nowrap" align="flex-start">
                            <Box className={styles.resultIcon} aria-hidden>
                              <SearchKindIcon kind={hit.kind} />
                            </Box>
                            <Stack gap={3} style={{ minWidth: 0, flex: 1 }}>
                              <Group gap="xs" wrap="nowrap" align="baseline">
                                <Text size="sm" fw={500} truncate>
                                  {hit.title}
                                </Text>
                                <Text size="xs" c="dimmed" className={styles.resultKind}>
                                  {t(`searchPage.kinds.${hit.kind}`)}
                                </Text>
                                {hit.kind === 'issue' || hit.kind === 'adr' ? (
                                  <Text size="xs" c="dimmed" ff="monospace">
                                    {hit.id}
                                  </Text>
                                ) : null}
                              </Group>
                              {hit.snippet ? (
                                <Text size="xs" c="dimmed" lineClamp={2}>
                                  {hit.snippet}
                                </Text>
                              ) : null}
                            </Stack>
                          </Group>
                        </SearchResultLink>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Stack align="center" gap={4} py="xl" role="status">
                    <Text fw={550}>
                      {hasFilters
                        ? t('searchPage.noResultsFiltered', { query: submittedQuery })
                        : t('searchPage.noResults')}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {t('searchPage.tryDifferentQuery')}
                    </Text>
                  </Stack>
                )
              ) : (
                <Stack align="center" gap={4} py="xl">
                  <Text fw={550}>{t('searchPage.startTitle')}</Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {t('searchPage.startDescription')}
                  </Text>
                </Stack>
              )}
            </Box>
          </ScrollArea>
          <SearchDateTimeframeDialog
            field={customDateField}
            value={customDateInput}
            granularity={customDateGranularity}
            onValueChange={handlers.onCustomDateInputChange}
            onGranularityChange={handlers.onCustomDateGranularityChange}
            onCancel={handlers.onCustomDateCancel}
            onApply={(range) =>
              customDateField && handlers.onCustomDateApply(customDateField, range)
            }
          />
        </Box>
      );
    }
  }
}

export function SearchPage() {
  return (
    <PresenterScope name="SearchPage">
      <SearchPageBinding />
    </PresenterScope>
  );
}

function SearchPageBinding() {
  const model = useSearchPagePresenter();
  const handlers = useActions(model.handlers);
  const searchRef = useFocusWhen<HTMLInputElement>(true);
  return <SearchPageView model={{ ...model, handlers } as typeof model} searchRef={searchRef} />;
}
