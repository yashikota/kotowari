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
  IconLayoutList,
  IconScale,
  IconSearch,
  IconStack2,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { useFocusWhen } from '../focus.ts';
import type { SearchHit } from '../types.ts';
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
      const { query, submittedQuery, tab, order, hits, handlers } = model;
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
                    <Menu.Item
                      aria-checked={order === 'title'}
                      leftSection={order === 'title' ? <IconCheck size={14} aria-hidden /> : null}
                      onClick={() => handlers.onOrderChange('title')}
                    >
                      {t('searchPage.titleAZ')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
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
                    <Text fw={550}>{t('searchPage.noResults')}</Text>
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
