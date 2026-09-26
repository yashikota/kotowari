import {
  Anchor,
  Badge,
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { IconArrowLeft, IconSearch, IconTarget, IconTrash } from '@tabler/icons-react';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import type { Initiative, InitiativeStatus, ProjectHealth } from '../types.ts';
import { formatCalendarDate } from '../time.ts';
import { InitiativeListControls } from '../components/InitiativeListControls.tsx';
import type { InitiativeDisplayProperty } from '../initiative-list.ts';
import {
  useInitiativeDetailPresenter,
  useInitiativesPagePresenter,
} from '../presenters/InitiativesPages.tsx';
import { useTranslation } from 'react-i18next';

const INITIATIVE_STATUSES: InitiativeStatus[] = [
  'proposed',
  'planned',
  'active',
  'completed',
  'canceled',
];
const INITIATIVE_HEALTH: ProjectHealth[] = ['on_track', 'at_risk', 'off_track'];
const INITIATIVE_COLORS = ['grey', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green'];

export function InitiativesPageView({
  model,
}: {
  model: ReturnType<typeof useInitiativesPagePresenter>;
}) {
  const { t } = useTranslation();
  const {
    initiatives,
    groups,
    scope,
    query,
    statusFilter,
    priorityFilter,
    healthFilter,
    labelFilter,
    labels,
    projectsFilter,
    targetDateFrom,
    targetDateTo,
    groupBy,
    orderBy,
    direction,
    displayProperties,
    filterOpened,
    optionsOpened,
    hasFilters,
    onActiveProjectCount,
    createOpen,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    error,
    saving,
    handlers,
  } = model;
  const statusOptions = INITIATIVE_STATUSES.map((value) => ({
    value,
    label: handlers.onStatusLabel(value),
  }));
  const colorOptions = INITIATIVE_COLORS.map((value) => ({ value, label: value }));
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader
          title={t('initiatives.title')}
          actions={
            <Button type="button" onClick={handlers.onOpenCreate}>
              {t('initiatives.new')}
            </Button>
          }
        />
        <Stack gap="sm" p="md" style={{ overflow: 'auto', minHeight: 0 }}>
          <Group justify="space-between" align="center" wrap="wrap">
            <Tabs value={scope} onChange={handlers.onScopeChange} variant="default">
              <Tabs.List>
                <Tabs.Tab value="active">{t('initiativeList.active')}</Tabs.Tab>
                <Tabs.Tab value="planned">{t('initiativeList.planned')}</Tabs.Tab>
                <Tabs.Tab value="all">{t('initiativeList.all')}</Tabs.Tab>
              </Tabs.List>
            </Tabs>
            <Group gap="xs" wrap="nowrap">
              <TextInput
                aria-label={t('initiativeList.search')}
                placeholder={t('initiativeList.search')}
                leftSection={<IconSearch size={15} aria-hidden />}
                value={query}
                onChange={handlers.onQueryChange}
                w={220}
              />
              <InitiativeListControls
                filterOpened={filterOpened}
                optionsOpened={optionsOpened}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
                healthFilter={healthFilter}
                labelFilter={labelFilter}
                labels={labels}
                projectsFilter={projectsFilter}
                targetDateFrom={targetDateFrom}
                targetDateTo={targetDateTo}
                groupBy={groupBy}
                orderBy={orderBy}
                direction={direction}
                displayProperties={displayProperties}
                hasFilters={hasFilters}
                handlers={handlers}
              />
            </Group>
          </Group>
          {initiatives.length === 0 ? (
            <EmptyState>
              <Stack align="center" gap="sm">
                <IconTarget size={24} stroke={1.5} aria-hidden />
                <Text fw={600}>{t('initiatives.empty')}</Text>
                <Text c="dimmed" ta="center" maw={380}>
                  {t('initiatives.emptyDescription')}
                </Text>
                <Button type="button" onClick={handlers.onOpenCreate}>
                  {t('initiatives.emptyCreate')}
                </Button>
                <Text size="xs" c="dimmed">
                  {t('initiatives.shortcutCreate')}
                </Text>
                <Anchor href="https://linear.app/docs/initiatives" target="_blank" rel="noreferrer">
                  {t('initiatives.emptyDocumentation')}
                </Anchor>
              </Stack>
            </EmptyState>
          ) : groups.every((group) => group.initiatives.length === 0) ? (
            <EmptyState>
              <Stack align="center" gap="sm">
                <Text fw={600}>{t('initiativeList.noMatches')}</Text>
                <Text c="dimmed" ta="center" maw={380}>
                  {t('initiativeList.noMatchesDescription')}
                </Text>
                <Button type="button" variant="default" onClick={handlers.onClearFilters}>
                  {t('initiativeList.clearFilters')}
                </Button>
              </Stack>
            </EmptyState>
          ) : (
            <Stack gap="lg">
              {groups.map((group) =>
                group.initiatives.length === 0 ? null : (
                  <Stack key={group.key} gap="xs">
                    {group.status ? (
                      <Group gap="xs" px="xs">
                        <Text size="sm" fw={600}>
                          {handlers.onStatusLabel(group.status)}
                        </Text>
                        <Badge size="sm" variant="light" color="gray">
                          {group.initiatives.length}
                        </Badge>
                      </Group>
                    ) : null}
                    <Table.ScrollContainer minWidth={640}>
                      <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('initiativeList.name')}</Table.Th>
                            {displayProperties.map((property) => (
                              <Table.Th key={property}>
                                {t(`initiativeList.property.${property}`)}
                              </Table.Th>
                            ))}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {group.initiatives.map((initiative: Initiative) => (
                            <InitiativeListRow
                              key={initiative.slug}
                              initiative={initiative}
                              displayProperties={displayProperties}
                              activeProjects={onActiveProjectCount(initiative)}
                              statusLabel={handlers.onStatusLabel(initiative.status)}
                            />
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </Stack>
                ),
              )}
            </Stack>
          )}
        </Stack>
        <Modal opened={createOpen} onClose={handlers.onCloseCreate} title={t('initiatives.new')}>
          <form onSubmit={handlers.onSubmitCreate}>
            <Stack>
              <TextInput
                label={t('initiatives.name')}
                value={name}
                onChange={handlers.onNameChange}
                required
                maxLength={120}
                autoFocus
              />
              <Textarea
                label={t('initiatives.description')}
                value={description}
                onChange={handlers.onDescriptionChange}
                minRows={3}
                autosize
              />
              <Group grow>
                <Select
                  label={t('initiatives.status')}
                  value={status}
                  onChange={handlers.onStatusChange}
                  data={statusOptions}
                />
                <Select
                  label={t('initiatives.color')}
                  value={color}
                  onChange={handlers.onColorChange}
                  data={colorOptions}
                />
              </Group>
              <Group grow>
                <TextInput
                  type="date"
                  label={t('initiatives.startDate')}
                  value={startDate}
                  onChange={handlers.onStartDateChange}
                />
                <TextInput
                  type="date"
                  label={t('initiatives.targetDate')}
                  value={targetDate}
                  onChange={handlers.onTargetDateChange}
                />
              </Group>
              {error ? (
                <Text c="red" role="alert">
                  {error}
                </Text>
              ) : null}
              <Group justify="flex-end">
                <Button type="button" variant="default" onClick={handlers.onCloseCreate}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={saving} disabled={!name.trim()}>
                  {t('initiatives.create')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Pane>
    </SplitLayout>
  );
}

function InitiativeListRow({
  initiative,
  displayProperties,
  activeProjects,
  statusLabel,
}: {
  initiative: Initiative;
  displayProperties: InitiativeDisplayProperty[];
  activeProjects: number;
  statusLabel: string;
}) {
  const { t, i18n } = useTranslation();
  const date = (value: string) => formatCalendarDate(value, i18n.language);
  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="xs" wrap="nowrap" miw={180}>
          <IconTarget size={17} color={initiative.color} aria-hidden />
          <Link
            to="/initiatives/$slug"
            params={{ slug: initiative.slug }}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <Text size="sm" fw={550} truncate>
              {initiative.name}
            </Text>
          </Link>
        </Group>
      </Table.Td>
      {displayProperties.map((property) => (
        <Table.Td key={property}>
          {property === 'id' ? (
            <Text size="xs" c="dimmed">
              #{initiative.id}
            </Text>
          ) : property === 'description' ? (
            <Text
              size="xs"
              c={initiative.description ? undefined : 'dimmed'}
              lineClamp={1}
              maw={300}
            >
              {initiative.description || '—'}
            </Text>
          ) : property === 'status' ? (
            <Badge size="sm" variant="light" color="gray">
              {statusLabel}
            </Badge>
          ) : property === 'priority' ? (
            <Text size="xs" c="dimmed">
              {t(`initiativeList.priorityValue.${initiative.priority ?? 0}`)}
            </Text>
          ) : property === 'health' ? (
            <Badge size="sm" variant="light" color={initiative.health ? 'green' : 'gray'}>
              {initiative.health
                ? t(`initiativeList.healthValue.${initiative.health}`)
                : t('initiativeList.noHealth')}
            </Badge>
          ) : property === 'labels' ? (
            <Group gap={4} wrap="nowrap">
              {initiative.labels?.length ? (
                initiative.labels.map((label) => (
                  <Badge key={label} size="xs" variant="light" color="gray">
                    {label}
                  </Badge>
                ))
              ) : (
                <Text size="xs" c="dimmed">
                  —
                </Text>
              )}
            </Group>
          ) : property === 'completed' ? (
            <Text size="xs" c={initiative.completedAt ? undefined : 'dimmed'}>
              {initiative.completedAt ? date(initiative.completedAt) : '—'}
            </Text>
          ) : property === 'projects' ? (
            <Text size="xs" c="dimmed">
              {t('initiatives.projectCount', { count: initiative.projectSlugs.length })}
            </Text>
          ) : property === 'activeProjects' ? (
            <Text size="xs" c="dimmed">
              {t('initiativeList.activeProjectCount', { count: activeProjects })}
            </Text>
          ) : property === 'targetDate' ? (
            <Text size="xs" c={initiative.targetDate ? undefined : 'dimmed'}>
              {initiative.targetDate ? date(initiative.targetDate) : '—'}
            </Text>
          ) : property === 'created' ? (
            <Text size="xs" c="dimmed">
              {date(initiative.createdAt)}
            </Text>
          ) : property === 'updated' ? (
            <Text size="xs" c="dimmed">
              {date(initiative.updatedAt)}
            </Text>
          ) : null}
        </Table.Td>
      ))}
    </Table.Tr>
  );
}

export function InitiativesPage() {
  return (
    <PresenterScope name="InitiativesPage">
      <InitiativesPageBinding />
    </PresenterScope>
  );
}

function InitiativesPageBinding() {
  const model = useInitiativesPagePresenter();
  const handlers = useActions(model.handlers);
  return <InitiativesPageView model={{ ...model, handlers } as typeof model} />;
}

export function InitiativeDetailPageView({
  model,
}: {
  model: ReturnType<typeof useInitiativeDetailPresenter>;
}) {
  const { t } = useTranslation();
  const {
    initiative,
    availableProjects,
    linkedProjects,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    priority,
    health,
    labels,
    availableLabels,
    projectSlugs,
    error,
    saving,
    handlers,
  } = model;
  return (
    <SplitLayout single>
      <Pane single>
        <PageHeader
          title={initiative.name}
          actions={
            <Group gap="xs">
              <Button
                type="button"
                variant="default"
                leftSection={<IconArrowLeft size={15} />}
                onClick={handlers.onBack}
              >
                {t('nav.initiatives')}
              </Button>
              <Button
                type="button"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={15} />}
                onClick={handlers.onDelete}
              >
                {t('initiatives.delete')}
              </Button>
            </Group>
          }
        />
        <form onSubmit={handlers.onSubmit}>
          <Stack p="md" maw={900} style={{ overflow: 'auto', minHeight: 0 }}>
            <Group grow align="flex-start">
              <TextInput
                label={t('initiatives.name')}
                value={name}
                onChange={handlers.onNameChange}
                required
                maxLength={120}
              />
              <Select
                label={t('initiatives.status')}
                value={status}
                onChange={handlers.onStatusChange}
                data={INITIATIVE_STATUSES.map((value) => ({
                  value,
                  label: handlers.onStatusLabel(value),
                }))}
              />
              <Select
                label={t('initiatives.color')}
                value={color}
                onChange={handlers.onColorChange}
                data={INITIATIVE_COLORS.map((value) => ({ value, label: value }))}
              />
            </Group>
            <Textarea
              label={t('initiatives.description')}
              value={description}
              onChange={handlers.onDescriptionChange}
              minRows={5}
              autosize
            />
            <Group grow>
              <TextInput
                type="date"
                label={t('initiatives.startDate')}
                value={startDate}
                onChange={handlers.onStartDateChange}
              />
              <TextInput
                type="date"
                label={t('initiatives.targetDate')}
                value={targetDate}
                onChange={handlers.onTargetDateChange}
              />
            </Group>
            <Group grow align="flex-start">
              <Select
                label={t('initiativeList.priority')}
                value={String(priority)}
                onChange={handlers.onPriorityChange}
                data={['0', '1', '2', '3', '4'].map((value) => ({
                  value,
                  label: t(`initiativeList.priorityValue.${value}`),
                }))}
              />
              <Select
                label={t('initiativeList.health')}
                value={health || null}
                onChange={handlers.onHealthChange}
                data={INITIATIVE_HEALTH.map((value) => ({
                  value,
                  label: t(`initiativeList.healthValue.${value}`),
                }))}
                clearable
              />
              <MultiSelect
                label={t('initiativeList.labels')}
                value={labels}
                onChange={handlers.onLabelsChange}
                data={availableLabels}
                searchable
                clearable
              />
            </Group>
            <MultiSelect
              label={t('initiatives.addProjects')}
              aria-label={t('initiatives.addProjects')}
              value={projectSlugs}
              onChange={handlers.onProjectSlugsChange}
              data={availableProjects}
              searchable
              clearable
              comboboxProps={{ withinPortal: false }}
            />
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                {t('initiatives.projects')}
              </Text>
              {linkedProjects.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('initiatives.noProjects')}
                </Text>
              ) : (
                <Group gap="xs">
                  {linkedProjects.map((project) => (
                    <Button
                      key={project.slug}
                      type="button"
                      size="compact-sm"
                      variant="default"
                      onClick={() => handlers.onProjectOpen(project.slug)}
                    >
                      {project.name}
                    </Button>
                  ))}
                </Group>
              )}
            </Stack>
            {error ? (
              <Text c="red" role="alert">
                {error}
              </Text>
            ) : null}
            <Group justify="flex-end">
              <Button type="submit" loading={saving} disabled={!name.trim()}>
                {t('initiatives.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Pane>
    </SplitLayout>
  );
}

export function InitiativeDetailPage() {
  return (
    <PresenterScope name="InitiativeDetailPage">
      <InitiativeDetailPageBinding />
    </PresenterScope>
  );
}

function InitiativeDetailPageBinding() {
  const model = useInitiativeDetailPresenter();
  const handlers = useActions(model.handlers);
  return <InitiativeDetailPageView model={{ ...model, handlers } as typeof model} />;
}
