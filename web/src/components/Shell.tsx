import { Outlet } from '@tanstack/react-router';
import {
  Alert,
  ActionIcon,
  AppShell,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  MultiSelect,
  NativeSelect,
  Select,
  ScrollArea,
  Stack,
  ThemeIcon,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  IconBook,
  IconBell,
  IconChevronRight,
  IconCircleDot,
  IconFilter,
  IconHome,
  IconLayoutKanban,
  IconListCheck,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconScale,
  IconSettings,
  IconStar,
  IconStack2,
  IconRepeat,
  IconSparkles,
  IconTemplate,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { priorityLabel } from '../i18n/labels.ts';
import { RouterNavLink } from '../mantine-ui.tsx';
import { CONFIG_NAV } from '../nav.ts';
import { workflowStatusLabel } from '../workflow.tsx';
import { IssueWorkflowProvider } from '../workflow.tsx';
import { ProjectWorkflowProvider } from '../project-workflow.tsx';
import { Palette } from './Palette.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';
import styles from './Shell.module.css';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShellPresenter } from '../presenters/Shell.tsx';

const NAV_ICONS: Record<string, ReactNode> = {
  '/': <IconHome size={14} aria-hidden />,
  '/reminders': <IconBell size={14} aria-hidden />,
  '/agent': <IconSparkles size={14} aria-hidden />,
  '/issues': <IconListCheck size={14} aria-hidden />,
  '/board': <IconLayoutKanban size={14} aria-hidden />,
  '/adrs': <IconScale size={14} aria-hidden />,
  '/projects': <IconStack2 size={14} aria-hidden />,
  '/cycles': <IconCircleDot size={14} aria-hidden />,
  '/pages': <IconBook size={14} aria-hidden />,
  '/config': <IconSettings size={14} aria-hidden />,
  '/templates': <IconTemplate size={14} aria-hidden />,
  '/recurring': <IconRepeat size={14} aria-hidden />,
};

export function ShellView({
  model,
  t,
  issueTitleRef,
  adrTitleRef,
  pageTitleRef,
  viewNameRef,
}: {
  model: ReturnType<typeof useShellPresenter>;
  t: ReturnType<typeof useTranslation>['t'];
  issueTitleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  adrTitleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  pageTitleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  viewNameRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
  switch (model._view) {
    case 0: {
      const {
        workspaceName,
        routeTitle,
        mobileNavigationOpen,
        sidebarNavigation,
        cycles,
        views,
        favoriteIssues,
        paletteOpen,
        query,
        createIssue,
        createADR,
        createPage,
        createView,
        issueTitle,
        issueStatus,
        issueWorkflowStatuses,
        issuePriority,
        issueProjectId,
        issueCycleId,
        helpOpen,
        projects,
        pageTitle,
        adrTitle,
        adrLinkIssue,
        viewName,
        error,
        commands,
        handlers,
      } = model;
      const favoriteCycles = cycles.filter((cycle) => cycle.isFavorite);
      return (
        <>
          <AppShell
            navbar={{ width: 244, breakpoint: 0 }}
            padding={0}
            className={`${styles.shell} ${mobileNavigationOpen ? styles.navigationOpen : ''}`}
            styles={{ root: { height: '100dvh', overflow: 'hidden' } }}
          >
            <AppShell.Navbar
              p={0}
              className={styles.sidebar}
              styles={{
                navbar: {
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderColor: 'var(--mantine-color-default-border)',
                },
              }}
              onClick={handlers.onNavbarClick}
            >
              <Group
                component="header"
                h={52}
                px="sm"
                gap="sm"
                justify="space-between"
                wrap="nowrap"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon size={20} radius="sm" color="indigo" aria-hidden>
                    {(workspaceName || 'K').slice(0, 1).toUpperCase()}
                  </ThemeIcon>
                  <Text
                    size="sm"
                    fw={600}
                    truncate
                    title={workspaceName || t('workspace.defaultName')}
                  >
                    {workspaceName || t('workspace.defaultName')}
                  </Text>
                </Group>
                <Group gap={2} wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    w={28}
                    h={28}
                    aria-label={t('nav.search')}
                    title={t('ui.searchShortcut')}
                    onClick={handlers.onOpenPalette}
                  >
                    <IconSearch size={15} stroke={1.7} aria-hidden />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    w={28}
                    h={28}
                    aria-label={t('modal.createIssue')}
                    title={`${t('modal.createIssue')} · C`}
                    onClick={handlers.onCreateIssue}
                  >
                    <IconPlus size={16} stroke={1.7} aria-hidden />
                  </ActionIcon>
                </Group>
              </Group>

              <AppShell.Section grow component={ScrollArea} p="xs" style={{ minHeight: 0 }}>
                <Stack gap={0} component="nav" aria-label={t('nav.primary')}>
                  {sidebarNavigation.personal.map((item) => (
                    <RouterNavLink
                      key={item.key}
                      to={item.to}
                      search={item.search}
                      params={item.params}
                      fuzzy={item.fuzzy}
                      label={t(item.labelKey)}
                      leftSection={NAV_ICONS[item.to as string]}
                    />
                  ))}
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.favorites')}>
                  <Text size="xs" c="dimmed" fw={500} px="xs" py="xs">
                    {t('nav.favorites')}
                  </Text>
                  {favoriteIssues.length === 0 && favoriteCycles.length === 0 ? (
                    <Text size="xs" c="dimmed" px="xs" py={4}>
                      {t('nav.favoriteHint')}
                    </Text>
                  ) : null}
                  {favoriteIssues.slice(0, 8).map((issue) => (
                    <RouterNavLink
                      key={`issue-${issue.identifier}`}
                      to="/issues/$identifier"
                      params={{ identifier: issue.identifier }}
                      label={`${issue.identifier} ${issue.title}`}
                      leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                    />
                  ))}
                  {favoriteCycles.slice(0, 8).map((cycle) => (
                    <RouterNavLink
                      key={`cycle-${cycle.number}`}
                      to="/cycles/$number"
                      params={{ number: String(cycle.number) }}
                      label={cycle.name || t('field.cycleN', { number: cycle.number })}
                      leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                    />
                  ))}
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.teamNavigation')}>
                  <Text size="xs" c="dimmed" fw={500} px="xs" py="xs" truncate>
                    {workspaceName || t('workspace.defaultName')}
                  </Text>
                  {sidebarNavigation.workspace.map((item) =>
                    item.to === '/cycles' ? (
                      <Stack key={item.key} gap={0}>
                        <RouterNavLink
                          to={item.to}
                          search={item.search}
                          params={item.params}
                          fuzzy={item.fuzzy}
                          label={t(item.labelKey)}
                          leftSection={NAV_ICONS[item.to as string]}
                        />
                        <Stack
                          component="div"
                          role="group"
                          aria-label={t('nav.cycleNavigation')}
                          gap={0}
                          pl="xl"
                        >
                          <RouterNavLink
                            to="/cycles"
                            search={{ scope: 'current' }}
                            label={t('nav.cycleCurrent')}
                          />
                          <RouterNavLink
                            to="/cycles"
                            search={{ scope: 'upcoming' }}
                            label={t('nav.cycleUpcoming')}
                          />
                        </Stack>
                      </Stack>
                    ) : (
                      <RouterNavLink
                        key={item.key}
                        to={item.to}
                        search={item.search}
                        params={item.params}
                        fuzzy={item.fuzzy}
                        label={t(item.labelKey)}
                        leftSection={NAV_ICONS[item.to as string]}
                      />
                    ),
                  )}
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.savedViews')}>
                  <Text size="xs" c="dimmed" fw={500} px="xs" py="xs">
                    {t('nav.views')}
                  </Text>
                  {views.map((v) => (
                    <RouterNavLink
                      key={v.slug}
                      to="/views/$slug"
                      params={{ slug: v.slug }}
                      label={v.name}
                      leftSection={<IconFilter size={14} aria-hidden />}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    justify="flex-start"
                    px="xs"
                    onClick={handlers.onClick0}
                  >
                    <Group gap={7} wrap="nowrap">
                      <IconPlus size={14} stroke={1.6} aria-hidden />
                      {t('nav.newView')}
                    </Group>
                  </Button>
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.more')}>
                  {sidebarNavigation.more.map((item) => (
                    <RouterNavLink
                      key={item.key}
                      to={item.to}
                      search={item.search}
                      params={item.params}
                      fuzzy={item.fuzzy}
                      label={t(item.labelKey)}
                      leftSection={NAV_ICONS[item.to as string]}
                    />
                  ))}
                </Stack>
              </AppShell.Section>

              <AppShell.Section
                p="xs"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                <Stack gap={0} component="nav" aria-label={t('nav.settings')}>
                  <RouterNavLink
                    to={CONFIG_NAV.to}
                    label={t(CONFIG_NAV.labelKey)}
                    leftSection={NAV_ICONS[CONFIG_NAV.to as string]}
                  />
                </Stack>
              </AppShell.Section>
            </AppShell.Navbar>

            {mobileNavigationOpen ? (
              <button
                type="button"
                className={styles.backdrop}
                aria-label={t('nav.closeNavigation')}
                onClick={handlers.onCloseMobileNavigation}
              />
            ) : null}

            <AppShell.Main className={styles.main}>
              <Group
                component="header"
                justify="space-between"
                gap="md"
                h={44}
                px="md"
                wrap="nowrap"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Group
                  component="nav"
                  aria-label={t('nav.breadcrumb')}
                  gap="sm"
                  wrap="nowrap"
                  style={{ minWidth: 0 }}
                >
                  <Text size="sm" c="dimmed" truncate maw={180}>
                    {workspaceName || t('workspace.defaultName')}
                  </Text>
                  <IconChevronRight
                    size={14}
                    stroke={1.6}
                    aria-hidden
                    color="var(--mantine-color-dimmed)"
                  />
                  <Text size="sm" fw={500} truncate>
                    {routeTitle}
                  </Text>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    w={28}
                    h={28}
                    className={styles.mobileMenuButton}
                    aria-label={
                      mobileNavigationOpen ? t('nav.closeNavigation') : t('nav.openNavigation')
                    }
                    onClick={handlers.onToggleMobileNavigation}
                  >
                    <IconMenu2 size={16} stroke={1.7} aria-hidden />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    w={28}
                    h={28}
                    aria-label={t('nav.search')}
                    title={t('ui.searchShortcut')}
                    onClick={handlers.onOpenPalette}
                  >
                    <IconSearch size={15} stroke={1.7} aria-hidden />
                  </ActionIcon>
                </Group>
              </Group>
              <Box style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'auto' }}>
                {error ? (
                  <Alert color="red" variant="light" m="sm">
                    {error}
                  </Alert>
                ) : null}
                <Outlet />
              </Box>
            </AppShell.Main>
          </AppShell>

          {paletteOpen ? (
            <Palette
              query={query}
              onQuery={handlers.onQuery6}
              commands={commands}
              onPick={handlers.onPick7}
              onClose={handlers.onClose8}
            />
          ) : null}
          {helpOpen ? <ShortcutHelp onClose={handlers.onClose9} /> : null}

          <Modal
            opened={createIssue}
            onClose={handlers.onClick10}
            title={t('modal.createIssue')}
            centered
            autoFocus={false}
          >
            <Stack gap="md">
              <Textarea
                ref={issueTitleRef}
                data-autofocus
                rows={2}
                aria-label={t('modal.issueTitle')}
                placeholder={t('modal.issueTitle')}
                value={issueTitle}
                onChange={handlers.Issue_title_onChange12}
                onKeyDown={handlers.Issue_title_onKeyDown13}
              />
              <Select
                aria-label={t('modal.issueTemplate')}
                label={t('modal.issueTemplate')}
                placeholder={t('modal.noIssueTemplate')}
                clearable
                value={model.issueTemplateSlug || null}
                data={model.issueTemplates.map((template) => ({
                  value: template.slug,
                  label: template.name,
                }))}
                onChange={handlers.Issue_template_onChange30}
              />
              <Textarea
                aria-label={t('modal.issueDescription')}
                label={t('modal.issueDescription')}
                rows={3}
                value={model.issueBody}
                onChange={handlers.Issue_body_onChange31}
              />
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {t('modal.enterHint')}
                </Text>
                <Button
                  type="button"
                  onClick={handlers.submitIssue}
                  disabled={model.issueParentLoading}
                >
                  {t('modal.create')}
                </Button>
              </Group>
              <Group grow align="flex-start">
                <NativeSelect
                  aria-label={t('field.status')}
                  label={t('field.status')}
                  value={issueStatus}
                  onChange={handlers.Issue_status_onChange14}
                  data={issueWorkflowStatuses.map((status) => ({
                    value: status.id,
                    label: workflowStatusLabel(status.id, issueWorkflowStatuses),
                  }))}
                />
                <NativeSelect
                  aria-label={t('field.priority')}
                  label={t('field.priority')}
                  value={String(issuePriority)}
                  onChange={handlers.Issue_priority_onChange15}
                  data={[0, 1, 2, 3, 4].map((i) => ({ value: String(i), label: priorityLabel(i) }))}
                />
                <NativeSelect
                  aria-label={t('field.type')}
                  label={t('field.type')}
                  value={model.issueType || 'none'}
                  onChange={handlers.Issue_type_onChange32}
                  data={[
                    { value: 'none', label: t('issueProperties.noType') },
                    ...(['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
                      value: type,
                      label: t(`issueType.${type}`),
                    })),
                  ]}
                />
                <NativeSelect
                  aria-label={t('field.estimate')}
                  label={t('field.estimate')}
                  value={model.issueEstimate || 'none'}
                  onChange={handlers.Issue_estimate_onChange33}
                  data={[
                    { value: 'none', label: t('issueProperties.noEstimate') },
                    ...[0, 1, 2, 3, 5, 8, 13, 21, 34].map((estimate) => ({
                      value: String(estimate),
                      label: String(estimate),
                    })),
                  ]}
                />
              </Group>
              <Group grow align="flex-start">
                <NativeSelect
                  aria-label={t('field.project')}
                  label={t('field.project')}
                  value={issueProjectId}
                  onChange={handlers.Issue_project_onChange16}
                  data={[
                    { value: '', label: t('field.noProject') },
                    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                  ]}
                />
                <NativeSelect
                  aria-label={t('field.cycle')}
                  label={t('field.cycle')}
                  value={issueCycleId}
                  onChange={handlers.Issue_cycle_onChange17}
                  data={[
                    { value: '', label: t('field.noCycle') },
                    ...cycles.map((c) => ({
                      value: String(c.id),
                      label: t('field.cycleN', { number: c.number }),
                    })),
                  ]}
                />
                <MultiSelect
                  aria-label={t('field.label')}
                  label={t('field.label')}
                  searchable
                  data={model.availableLabels.map((label) => ({
                    value: label.name,
                    label: label.name,
                  }))}
                  value={model.issueLabelNames}
                  onChange={handlers.Issue_labels_onChange34}
                />
                <TextInput
                  type="date"
                  aria-label={t('issueProperties.dueDate')}
                  label={t('issueProperties.dueDate')}
                  value={model.issueDueDate}
                  onChange={handlers.Issue_dueDate_onChange35}
                />
              </Group>
              <Select
                aria-label={t('issueProperties.parent')}
                label={t('issueProperties.parent')}
                placeholder={t('issueProperties.noParent')}
                searchable
                clearable
                searchValue={model.issueParentQuery}
                value={model.issueParentIdentifier || null}
                data={model.issueParentOptions}
                nothingFoundMessage={t('issueProperties.noIssuesFound')}
                onSearchChange={handlers.Issue_parentSearch_onChange36}
                onChange={handlers.Issue_parent_onChange37}
              />
            </Stack>
          </Modal>

          <Modal
            opened={createADR}
            onClose={handlers.onClick18}
            title={t('modal.createAdr')}
            centered
            autoFocus={false}
          >
            <Stack gap="md">
              <Textarea
                ref={adrTitleRef}
                data-autofocus
                rows={2}
                aria-label={t('modal.adrTitle')}
                placeholder={t('modal.adrTitle')}
                value={adrTitle}
                onChange={handlers.ADR_title_onChange20}
                onKeyDown={handlers.ADR_title_onKeyDown21}
              />
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {t('modal.enterHint')}
                </Text>
                <Button type="button" onClick={handlers.submitADR}>
                  {t('modal.create')}
                </Button>
              </Group>
              {adrLinkIssue ? (
                <Text size="sm" c="dimmed">
                  {t('modal.willLinkIssue', { issue: adrLinkIssue })}
                </Text>
              ) : null}
            </Stack>
          </Modal>

          <Modal
            opened={createPage}
            onClose={handlers.onClick22}
            title={t('modal.createPage')}
            centered
            autoFocus={false}
          >
            <Stack gap="md">
              <Textarea
                ref={pageTitleRef}
                data-autofocus
                rows={2}
                aria-label={t('modal.pageTitle')}
                placeholder={t('modal.pageTitle')}
                value={pageTitle}
                onChange={handlers.Page_title_onChange24}
                onKeyDown={handlers.Page_title_onKeyDown25}
              />
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {t('modal.enterHint')}
                </Text>
                <Button type="button" onClick={handlers.submitPage}>
                  {t('modal.create')}
                </Button>
              </Group>
            </Stack>
          </Modal>

          <Modal
            opened={createView}
            onClose={handlers.onClick26}
            title={t('modal.createView')}
            centered
            autoFocus={false}
          >
            <Stack gap="md">
              <Textarea
                ref={viewNameRef}
                data-autofocus
                rows={2}
                aria-label={t('modal.viewName')}
                placeholder={t('modal.viewName')}
                value={viewName}
                onChange={handlers.View_name_onChange28}
                onKeyDown={handlers.View_name_onKeyDown29}
              />
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {t('modal.enterHint')}
                </Text>
                <Button type="button" onClick={handlers.submitView}>
                  {t('modal.create')}
                </Button>
              </Group>
            </Stack>
          </Modal>
        </>
      );
    }
  }
}

export function Shell() {
  return (
    <PresenterScope name="Shell">
      <ShellBinding />
    </PresenterScope>
  );
}

function ShellBinding() {
  const model = useShellPresenter();
  const handlers = useActions(model.handlers);
  const { t } = useTranslation();
  const issueTitleRef = useFocusWhen<HTMLTextAreaElement>(model.createIssue);
  const adrTitleRef = useFocusWhen<HTMLTextAreaElement>(model.createADR);
  const pageTitleRef = useFocusWhen<HTMLTextAreaElement>(model.createPage);
  const viewNameRef = useFocusWhen<HTMLTextAreaElement>(model.createView);
  return (
    <IssueWorkflowProvider>
      <ProjectWorkflowProvider>
        <ShellView
          model={{ ...model, handlers } as typeof model}
          t={t}
          issueTitleRef={issueTitleRef}
          adrTitleRef={adrTitleRef}
          pageTitleRef={pageTitleRef}
          viewNameRef={viewNameRef}
        />
      </ProjectWorkflowProvider>
    </IssueWorkflowProvider>
  );
}
