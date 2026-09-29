import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  IconExternalLink,
  IconDotsVertical,
  IconFileText,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconPlus,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';

import { CycleProgressSummary } from '../components/CycleProgressSummary.tsx';
import { CycleProgressChart } from '../components/CycleProgressChart.tsx';
import { CycleProgressBreakdown } from '../components/CycleProgressBreakdown.tsx';

import { CycleDateRangeControl } from '../components/CycleDateRangeControl.tsx';

import { CYCLE_STATUSES } from '../types.ts';
import { MetaBadge, Pane, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';

import { useCycleDetailPagePresenter } from '../presenters/CycleDetail.tsx';

export function CycleDetailPageView({
  model,
}: {
  model: ReturnType<typeof useCycleDetailPagePresenter>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  switch (model._view) {
    case 0: {
      const {
        data,
        issues,
        search,
        selected,
        cycle,
        cycleDetailsOpen,
        cycleProgressOpen,
        googleCalendarURL,
        resources,
        progressTimeline,
        activeProgressPoint,
        breakdownBy,
        breakdownItems,
        activeBreakdownFilterKey,
        scope,
        started,
        startedPercent,
        done,
        completionPercent,
        metadataOpen,
        datesOpen,
        resourceLinkOpen,
        resourceURL,
        resourceTitle,
        resourceError,
        cycleLinkCopied,
        calendarFeedCopied,
        nameDraft,
        descriptionDraft,
        startDateDraft,
        endDateDraft,
        datesValid,
        groupBy,
        layout,
        orderBy,
        subGroupBy,
        direction,
        completedIssues,
        completedByRecency,
        groupOptions,
        groupOrder,
        hiddenGroups,
        showSubIssues,
        nestedSubIssues,
        showEmptyGroups,
        displayProperties,
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box style={{ flex: 1, minHeight: 0 }}>
            <SplitLayout>
              <Pane variant="list" single={!cycleDetailsOpen}>
                <Group
                  justify="space-between"
                  px="md"
                  py="sm"
                  mih={44}
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Text size="sm" c="dimmed">
                    {t('cycle.issuesCount', { count: issues.length })}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color="gray"
                      aria-label={t(cycleDetailsOpen ? 'cycle.closeDetails' : 'cycle.openDetails')}
                      title={t(cycleDetailsOpen ? 'cycle.closeDetails' : 'cycle.openDetails')}
                      aria-expanded={cycleDetailsOpen}
                      onClick={handlers.onToggleCycleDetails}
                    >
                      {cycleDetailsOpen ? (
                        <IconLayoutSidebarRightCollapse size={16} aria-hidden="true" />
                      ) : (
                        <IconLayoutSidebarRightExpand size={16} aria-hidden="true" />
                      )}
                    </ActionIcon>
                    <Button
                      type="button"
                      size="compact-sm"
                      variant="subtle"
                      leftSection={<IconPlus size={14} aria-hidden="true" />}
                      onClick={handlers.onClick1}
                    >
                      {t('cycle.newIssue')}
                    </Button>
                  </Group>
                </Group>
                <IssueFilters
                  search={search}
                  projects={data.projects}
                  cycles={data.cycles}
                  labels={data.labels}
                  linkSources={data.linkSources}
                  templateOptions={data.templateOptions}
                  onChange={handlers.onFilterChange}
                  groupBy={groupBy}
                  onGroupBy={handlers.onGroupBy}
                  groupOptions={groupOptions}
                  groupOrder={groupOrder}
                  hiddenGroups={hiddenGroups}
                  onGroupOrderChange={handlers.onGroupOrderChange}
                  onGroupVisibilityChange={handlers.onGroupVisibilityChange}
                  layout={layout}
                  onLayout={handlers.onLayout}
                  orderBy={orderBy}
                  onOrderBy={handlers.onOrderBy}
                  subGroupBy={subGroupBy}
                  onSubGroupBy={handlers.onSubGroupBy}
                  direction={direction}
                  onDirection={handlers.onDirection}
                  completedIssues={completedIssues}
                  completedByRecency={completedByRecency}
                  onCompletedByRecencyChange={handlers.onCompletedByRecencyChange}
                  onCompletedIssues={handlers.onCompletedIssues}
                  showSubIssues={showSubIssues}
                  onShowSubIssues={handlers.onShowSubIssues}
                  nestedSubIssues={nestedSubIssues}
                  onNestedSubIssues={handlers.onNestedSubIssues}
                  showEmptyGroups={showEmptyGroups}
                  onShowEmptyGroups={handlers.onShowEmptyGroups}
                  displayProperties={displayProperties}
                  onDisplayPropertyToggle={handlers.onDisplayPropertyToggle}
                />
                <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  {layout === 'list' ? (
                    <IssueList
                      issues={issues}
                      selectedId={selected}
                      onSelect={handlers.onSelect2}
                      groupBy={groupBy}
                      orderBy={orderBy}
                      subGroupBy={subGroupBy}
                      direction={direction}
                      showEmptyGroups={showEmptyGroups}
                      showSubIssues={showSubIssues}
                      completedByRecency={completedByRecency}
                      groupOrder={groupOrder}
                      hiddenGroups={hiddenGroups}
                      displayProperties={displayProperties}
                      projects={data.projects}
                      cycles={data.cycles}
                      labels={data.labels}
                    />
                  ) : (
                    <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                      <IssueBoard
                        issues={issues}
                        orderBy={orderBy}
                        direction={direction}
                        showSubIssues={showSubIssues}
                        completedByRecency={completedByRecency}
                        onOpen={handlers.onBoardOpen}
                        onMove={handlers.onBoardMove}
                      />
                    </Box>
                  )}
                </Box>
              </Pane>
              {cycleDetailsOpen ? (
                <Pane variant="detail">
                  <Stack gap="lg">
                    <Stack gap="sm">
                      <CycleDateRangeControl
                        status={cycle.status}
                        startsAt={cycle.startsAt}
                        endsAt={cycle.endsAt}
                        onStartDateChange={handlers.onStartDatePickerChange}
                        onEndDateChange={handlers.onEndDatePickerChange}
                      />
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Text size="md" fw={600} truncate>
                          {cycle.name || t('field.cycleN', { number: cycle.number })}
                        </Text>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            type="button"
                            variant="subtle"
                            color={cycle.isFavorite ? 'yellow' : 'gray'}
                            aria-label={t(
                              cycle.isFavorite ? 'cycle.removeFavorite' : 'cycle.favorite',
                            )}
                            aria-pressed={!!cycle.isFavorite}
                            title={t(cycle.isFavorite ? 'cycle.removeFavorite' : 'cycle.favorite')}
                            onClick={handlers.onToggleFavorite}
                          >
                            <IconStar
                              size={15}
                              stroke={1.7}
                              fill={cycle.isFavorite ? 'currentColor' : 'none'}
                              aria-hidden="true"
                            />
                          </ActionIcon>
                          <Menu withinPortal shadow="md" position="bottom-end">
                            <Menu.Target>
                              <ActionIcon
                                type="button"
                                variant="subtle"
                                aria-label={t('cycle.options')}
                                title={t('cycle.options')}
                              >
                                <IconDotsVertical size={16} aria-hidden="true" />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Sub>
                                <Menu.Sub.Target>
                                  <Menu.Sub.Item>{t('cycle.changeStatus')}</Menu.Sub.Item>
                                </Menu.Sub.Target>
                                <Menu.Sub.Dropdown>
                                  {CYCLE_STATUSES.map((status) => (
                                    <Menu.Item
                                      key={status}
                                      onClick={() => handlers.onStatusChange(status)}
                                    >
                                      {t(`cycle.status.${status}`)}
                                    </Menu.Item>
                                  ))}
                                </Menu.Sub.Dropdown>
                              </Menu.Sub>
                              <Menu.Item onClick={handlers.onOpenMetadata}>
                                {t('cycle.editNameAndDescription')}
                              </Menu.Item>
                              <Menu.Item onClick={handlers.onToggleCycleArchived}>
                                {t(cycle.archivedAt ? 'cycle.restore' : 'cycle.archive')}
                              </Menu.Item>
                              {cycle.status !== 'completed' ? (
                                <Menu.Item onClick={handlers.onOpenDates}>
                                  {t('cycle.changeDates')}
                                </Menu.Item>
                              ) : null}
                              {cycle.status === 'upcoming' ? (
                                <Menu.Item onClick={handlers.onStartCycleToday}>
                                  {t('cycle.startToday')}
                                </Menu.Item>
                              ) : null}
                              <Menu.Sub>
                                <Menu.Sub.Target>
                                  <Menu.Sub.Item>{t('cycle.subscribeNotifications')}</Menu.Sub.Item>
                                </Menu.Sub.Target>
                                <Menu.Sub.Dropdown>
                                  <Menu.CheckboxItem
                                    checked={!!cycle.notifyOnIssueAdded}
                                    closeMenuOnClick={false}
                                    onChange={handlers.onToggleIssueAddedNotifications}
                                  >
                                    {t('cycle.notifyIssueAdded')}
                                  </Menu.CheckboxItem>
                                  <Menu.CheckboxItem
                                    checked={!!cycle.notifyOnIssueCompleted}
                                    closeMenuOnClick={false}
                                    onChange={handlers.onToggleIssueCompletedNotifications}
                                  >
                                    {t('cycle.notifyIssueCompleted')}
                                  </Menu.CheckboxItem>
                                </Menu.Sub.Dropdown>
                              </Menu.Sub>
                              <Menu.Item onClick={handlers.onCopyLink}>
                                {cycleLinkCopied ? t('cycle.linkCopied') : t('cycle.copyLink')}
                              </Menu.Item>
                              <Menu.Item onClick={handlers.onExportIssues}>
                                {t('cycle.exportIssues')}
                              </Menu.Item>
                              <Menu.Sub>
                                <Menu.Sub.Target>
                                  <Menu.Sub.Item>{t('cycle.subscribeCalendar')}</Menu.Sub.Item>
                                </Menu.Sub.Target>
                                <Menu.Sub.Dropdown>
                                  <Menu.Item
                                    component="a"
                                    href={googleCalendarURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {t('cycle.addToGoogleCalendar')}
                                  </Menu.Item>
                                  <Menu.Item onClick={handlers.onCopyCalendarFeed}>
                                    {calendarFeedCopied
                                      ? t('cycle.calendarFeedCopied')
                                      : t('cycle.copyCalendarFeed')}
                                  </Menu.Item>
                                  <Menu.Item onClick={handlers.onExportCalendar}>
                                    {t('cycle.exportCalendar')}
                                  </Menu.Item>
                                </Menu.Sub.Dropdown>
                              </Menu.Sub>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Group>
                    </Stack>
                    <Stack component="section" aria-label={t('cycle.resourcesHeading')} gap="sm">
                      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                        <Menu withinPortal shadow="md" position="bottom-end">
                          <Menu.Target>
                            <Button type="button" size="compact-sm" variant="subtle">
                              {t('cycle.addDocumentOrLink')}
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item onClick={handlers.onCreateDocument}>
                              {t('cycle.createDocument')}
                            </Menu.Item>
                            <Menu.Item onClick={handlers.onOpenResourceLink}>
                              {t('cycle.addLink')}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                      {resources.length > 0 ? (
                        <Stack gap="xs" role="list" aria-label={t('cycle.resourcesHeading')}>
                          {resources.map((resource) => (
                            <Group
                              key={resource.id}
                              justify="space-between"
                              wrap="nowrap"
                              role="listitem"
                            >
                              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                                {resource.pageSlug ? (
                                  <IconFileText size={15} aria-hidden="true" />
                                ) : (
                                  <IconExternalLink size={15} aria-hidden="true" />
                                )}
                                {resource.pageSlug ? (
                                  <Link to="/pages/$slug" params={{ slug: resource.pageSlug }}>
                                    {resource.displayTitle}
                                  </Link>
                                ) : (
                                  <a href={resource.url} target="_blank" rel="noreferrer">
                                    {resource.displayTitle}
                                  </a>
                                )}
                                <MetaBadge>{t(`issueLinks.${resource.kind}`)}</MetaBadge>
                              </Group>
                              <ActionIcon
                                type="button"
                                variant="subtle"
                                color="gray"
                                aria-label={t('cycle.removeResource', {
                                  title: resource.displayTitle,
                                })}
                                onClick={() => handlers.onRemoveResource(resource.id)}
                              >
                                <IconTrash size={15} />
                              </ActionIcon>
                            </Group>
                          ))}
                        </Stack>
                      ) : null}
                    </Stack>
                    <CycleProgressSummary
                      scope={scope}
                      started={started}
                      startedPercent={startedPercent}
                      completed={done}
                      completionPercent={completionPercent}
                      expanded={cycleProgressOpen}
                      onToggle={handlers.onToggleCycleProgress}
                    >
                      <CycleProgressChart
                        cycle={cycle}
                        points={progressTimeline}
                        locale={locale}
                        activePoint={activeProgressPoint}
                        onPointerMove={handlers.onProgressPointerMove}
                        onPointerLeave={handlers.onProgressPointerLeave}
                        onFocus={handlers.onProgressFocus}
                        onBlur={handlers.onProgressBlur}
                        onKeyDown={handlers.onProgressKeyDown}
                      />
                      <CycleProgressBreakdown
                        by={breakdownBy}
                        items={breakdownItems}
                        activeKey={activeBreakdownFilterKey}
                        onChange={handlers.onCycleBreakdownChange}
                        onFilterToggle={handlers.onCycleBreakdownFilterToggle}
                      />
                    </CycleProgressSummary>
                    {cycle.description ? <Text size="sm">{cycle.description}</Text> : null}
                  </Stack>
                </Pane>
              ) : null}
            </SplitLayout>
          </Box>
          <Modal
            opened={metadataOpen}
            onClose={handlers.onCloseMetadata}
            title={t('cycle.editNameAndDescription')}
            centered
          >
            <Box component="form" onSubmit={handlers.onSaveMetadata}>
              <Stack>
                <TextInput
                  required
                  maxLength={120}
                  label={t('cycle.name')}
                  value={nameDraft}
                  onChange={handlers.onNameChange}
                />
                <Textarea
                  label={t('cycle.description')}
                  value={descriptionDraft}
                  onChange={handlers.onDescriptionChange}
                  minRows={3}
                  autosize
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseMetadata}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!nameDraft.trim()}>
                    {t('common.save')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
          <Modal
            opened={datesOpen}
            onClose={handlers.onCloseDates}
            title={t('cycle.changeDates')}
            centered
          >
            <Box component="form" onSubmit={handlers.onSaveDates}>
              <Stack>
                <TextInput
                  type="date"
                  label={t('cycle.startDate')}
                  value={startDateDraft}
                  disabled={cycle.status === 'active'}
                  onChange={handlers.onStartDateChange}
                />
                {cycle.status === 'active' ? (
                  <Text size="xs" c="dimmed">
                    {t('cycle.activeStartDateHint')}
                  </Text>
                ) : null}
                <TextInput
                  type="date"
                  label={t('cycle.endDate')}
                  value={endDateDraft}
                  onChange={handlers.onEndDateChange}
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseDates}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!datesValid}>
                    {t('common.save')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
          <Modal
            opened={resourceLinkOpen}
            onClose={handlers.onCloseResourceLink}
            title={t('cycle.addLinkTitle')}
            centered
          >
            <Box component="form" onSubmit={handlers.onAddResourceLink}>
              <Stack>
                <TextInput
                  type="url"
                  required
                  label={t('cycle.url')}
                  placeholder={t('ui.urlPlaceholder')}
                  value={resourceURL}
                  onChange={handlers.onResourceURLChange}
                />
                <TextInput
                  label={t('cycle.linkTitle')}
                  value={resourceTitle}
                  onChange={handlers.onResourceTitleChange}
                />
                {resourceError ? (
                  <Text size="sm" c="red" role="alert">
                    {resourceError}
                  </Text>
                ) : null}
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseResourceLink}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">{t('cycle.saveLink')}</Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
        </Box>
      );
    }
  }
}

export function CycleDetailPage() {
  return (
    <PresenterScope name="CycleDetailPage">
      <CycleDetailPageBinding />
    </PresenterScope>
  );
}

function CycleDetailPageBinding() {
  const model = useCycleDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <CycleDetailPageView model={{ ...model, handlers } as typeof model} />;
}
