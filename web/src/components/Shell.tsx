import { Link, Outlet } from '@tanstack/react-router';
import {
  Alert,
  ActionIcon,
  AppShell,
  Box,
  Button,
  Checkbox,
  Divider,
  FileInput,
  Group,
  Modal,
  Menu,
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
  IconArchive,
  IconBell,
  IconChevronRight,
  IconCircleDot,
  IconDots,
  IconFilter,
  IconGitPullRequest,
  IconHome,
  IconInbox,
  IconLayoutKanban,
  IconListCheck,
  IconMenu2,
  IconPlus,
  IconPaperclip,
  IconSearch,
  IconScale,
  IconSettings,
  IconStar,
  IconStack2,
  IconRepeat,
  IconSparkles,
  IconTemplate,
  IconTarget,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { RouterNavLink } from '../mantine-ui.tsx';
import { CycleNavigationMenu } from './CycleNavigationMenu.tsx';
import { CONFIG_NAV } from '../nav.ts';
import { IssueWorkflowProvider } from '../workflow.tsx';
import { ProjectWorkflowProvider } from '../project-workflow.tsx';
import { Palette } from './Palette.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';
import { IssueCreateProperties } from './IssueCreateProperties.tsx';
import { ViewIcon } from './ViewIcon.tsx';
import { SidebarCustomizationModal } from './SidebarCustomizationModal.tsx';
import styles from './Shell.module.css';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShellPresenter } from '../presenters/Shell.tsx';
import type { SidebarItemId, SidebarBadgeStyle } from '../preferences.ts';

function SidebarBadge({
  count,
  style,
  label,
}: {
  count: number;
  style: SidebarBadgeStyle;
  label: string;
}) {
  if (count < 1) return undefined;
  if (style === 'dot')
    return (
      <Box
        component="span"
        role="img"
        aria-label={label}
        title={label}
        w={7}
        h={7}
        style={{ borderRadius: '50%', background: 'var(--mantine-color-blue-5)' }}
      />
    );
  return (
    <Text
      component="span"
      role="img"
      aria-label={label}
      title={label}
      size="xs"
      fw={600}
      c="dimmed"
    >
      {count > 99 ? '99+' : count}
    </Text>
  );
}

const NAV_ICONS: Record<string, ReactNode> = {
  '/': <IconHome size={14} aria-hidden />,
  '/inbox': <IconInbox size={14} aria-hidden />,
  '/reviews': <IconGitPullRequest size={14} aria-hidden />,
  '/reminders': <IconBell size={14} aria-hidden />,
  '/agent': <IconSparkles size={14} aria-hidden />,
  '/issues': <IconListCheck size={14} aria-hidden />,
  '/my-issues': <IconListCheck size={14} aria-hidden />,
  '/board': <IconLayoutKanban size={14} aria-hidden />,
  '/adrs': <IconScale size={14} aria-hidden />,
  '/projects': <IconStack2 size={14} aria-hidden />,
  '/initiatives': <IconTarget size={14} aria-hidden />,
  '/cycles': <IconCircleDot size={14} aria-hidden />,
  '/pages': <IconBook size={14} aria-hidden />,
  '/config': <IconSettings size={14} aria-hidden />,
  '/templates': <IconTemplate size={14} aria-hidden />,
  '/recurring': <IconRepeat size={14} aria-hidden />,
};

function SidebarGroupToggle({
  label,
  expanded,
  onClick,
  ariaLabel,
  leftSection,
}: {
  label: string;
  expanded: boolean;
  onClick: () => void;
  ariaLabel?: string;
  leftSection?: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="subtle"
      color="gray"
      size="compact-sm"
      justify="flex-start"
      px="xs"
      fullWidth
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <Group gap={7} wrap="nowrap" w="100%">
        {leftSection}
        <Text size="sm" fw={550} c="dimmed">
          {label}
        </Text>
        <IconChevronRight
          size={13}
          aria-hidden
          style={{
            marginInlineStart: 'auto',
            transform: expanded ? 'rotate(90deg)' : undefined,
          }}
        />
      </Group>
    </Button>
  );
}

export function ShellView({
  model,
  t,
  issueTitleRef,
  adrTitleRef,
  pageTitleRef,
}: {
  model: ReturnType<typeof useShellPresenter>;
  t: ReturnType<typeof useTranslation>['t'];
  issueTitleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  adrTitleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  pageTitleRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
  switch (model._view) {
    case 0: {
      const {
        workspaceName,
        routeTitle,
        isIssueDetail,
        isCycleDetail,
        currentCycleName,
        cycleNavigationOpen,
        cycleNavigationQuery,
        nextCycles,
        previousCycles,
        isPageOwnedHeader,
        mobileNavigationOpen,
        moreLinksOpen,
        sidebarNavigation,
        sidebarBadgeCounts,
        sidebarBadgeStyle,
        sidebarGroups,
        sidebarCustomizationOpen,
        cycles,
        views,
        favoriteIssues,
        favoriteIssueViews,
        paletteOpen,
        query,
        createIssue,
        createADR,
        createPage,
        issueTitle,
        issueStatus,
        issuePriority,
        issueAssignee,
        issueProjectId,
        issueCycleId,
        helpOpen,
        projects,
        pageTitle,
        adrTitle,
        adrLinkIssue,
        error,
        commands,
        handlers,
      } = model;
      const favoriteCycles = cycles.filter((cycle) => cycle.isFavorite);
      const favoriteProjects = projects.filter((project) => project.isFavorite);
      const favoriteViews = views.filter((view) => view.isFavorite);
      const sidebarBadge = (id: SidebarItemId) => {
        const count = sidebarBadgeCounts[id] ?? 0;
        if (!count) return undefined;
        const label =
          id === '/inbox' ? t('nav.unreadCount', { count }) : t('nav.reviewCount', { count });
        return <SidebarBadge count={count} style={sidebarBadgeStyle} label={label} />;
      };
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
                <Menu position="bottom-start" withinPortal>
                  <Menu.Target>
                    <Button
                      type="button"
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      px={6}
                      aria-label={t('nav.workspaceMenu', {
                        workspace: workspaceName || t('workspace.defaultName'),
                      })}
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
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>{workspaceName || t('workspace.defaultName')}</Menu.Label>
                    <Menu.Item
                      leftSection={<IconSettings size={14} aria-hidden />}
                      onClick={handlers.onOpenSidebarCustomization}
                    >
                      {t('config.customizeSidebar')}
                    </Menu.Item>
                    <Menu.Item
                      component={Link}
                      to="/config"
                      leftSection={<IconSettings size={14} aria-hidden />}
                    >
                      {t('nav.config')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Group gap={2} wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    w={28}
                    h={28}
                    aria-label={t('nav.search')}
                    title={t('ui.searchShortcut')}
                    onClick={handlers.onOpenSearch}
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
                      rightSection={sidebarBadge(item.id)}
                    />
                  ))}
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.workspaceNavigation')}>
                  <SidebarGroupToggle
                    label={t('nav.workspace')}
                    expanded={model.workspaceNavigationOpen}
                    onClick={handlers.onToggleWorkspaceNavigation}
                  />
                  {model.workspaceNavigationOpen ? (
                    <Stack gap={0}>
                      <RouterNavLink
                        to="/projects"
                        label={t('nav.projects')}
                        leftSection={<IconStack2 size={14} aria-hidden />}
                      />
                      <RouterNavLink
                        to="/views"
                        label={t('nav.views')}
                        leftSection={<IconFilter size={14} aria-hidden />}
                      />
                      <SidebarGroupToggle
                        label={t('nav.more')}
                        ariaLabel={t('nav.showMoreLinks')}
                        expanded={moreLinksOpen}
                        onClick={handlers.onToggleMoreLinks}
                        leftSection={<IconDots size={14} aria-hidden />}
                      />
                      {moreLinksOpen ? (
                        <Stack component="nav" aria-label={t('nav.more')} gap={0} pl="sm">
                          {sidebarNavigation.more.map((item) => (
                            <RouterNavLink
                              key={item.key}
                              to={item.to}
                              search={item.search}
                              params={item.params}
                              fuzzy={item.fuzzy}
                              label={t(item.labelKey)}
                              leftSection={NAV_ICONS[item.to as string]}
                              rightSection={sidebarBadge(item.id)}
                            />
                          ))}
                          <RouterNavLink
                            to="/issues"
                            search={{ archived: true }}
                            label={t('nav.archivedIssues')}
                            leftSection={<IconArchive size={14} aria-hidden />}
                          />
                        </Stack>
                      ) : null}
                    </Stack>
                  ) : null}
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.favorites')}>
                  <SidebarGroupToggle
                    label={t('nav.favorites')}
                    expanded={model.favoritesOpen}
                    onClick={handlers.onToggleFavorites}
                  />
                  {model.favoritesOpen ? (
                    <Stack gap={0}>
                      {favoriteIssues.map((issue) => (
                        <RouterNavLink
                          key={`issue-${issue.identifier}`}
                          to="/issues/$identifier"
                          params={{ identifier: issue.identifier }}
                          label={`${issue.identifier} ${issue.title}`}
                          leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                        />
                      ))}
                      {favoriteIssueViews.map((view) => (
                        <RouterNavLink
                          key={`issue-view-${view}`}
                          to="/issues"
                          search={view === 'archived' ? { archived: true } : { view }}
                          label={t(`issueViews.${view}`)}
                          leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                        />
                      ))}
                      {favoriteProjects.map((project) => (
                        <RouterNavLink
                          key={`project-${project.slug}`}
                          to="/projects/$slug"
                          params={{ slug: project.slug }}
                          label={project.name}
                          leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                        />
                      ))}
                      {favoriteViews.map((view) => (
                        <RouterNavLink
                          key={`view-${view.slug}`}
                          to="/views/$slug"
                          params={{ slug: view.slug }}
                          label={view.name}
                          leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                        />
                      ))}
                      {favoriteCycles.map((cycle) => (
                        <RouterNavLink
                          key={`cycle-${cycle.number}`}
                          to="/cycles/$number"
                          params={{ number: String(cycle.number) }}
                          label={cycle.name || t('field.cycleN', { number: cycle.number })}
                          leftSection={<IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Stack>

                <Divider my="sm" mx="xs" />

                <Stack gap={0} component="nav" aria-label={t('nav.teamNavigation')}>
                  <SidebarGroupToggle
                    label={t('nav.yourTeams')}
                    expanded={model.teamsOpen}
                    onClick={handlers.onToggleTeams}
                  />
                  {model.teamsOpen ? (
                    <Stack gap={0}>
                      <SidebarGroupToggle
                        label={workspaceName || t('workspace.defaultName')}
                        expanded={model.teamNavigationOpen}
                        onClick={handlers.onToggleTeamNavigation}
                      />
                      {model.teamNavigationOpen ? (
                        <>
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
                                  rightSection={sidebarBadge(item.id)}
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
                                rightSection={sidebarBadge(item.id)}
                              />
                            ),
                          )}
                          <Stack gap={0} component="nav" aria-label={t('nav.savedViews')}>
                            <Text size="xs" c="dimmed" fw={500} px="xs" py="xs">
                              {t('nav.views')}
                            </Text>
                            {views.map((view) => (
                              <RouterNavLink
                                key={view.slug}
                                to="/views/$slug"
                                params={{ slug: view.slug }}
                                label={view.name}
                                leftSection={<ViewIcon name={view.icon} size={14} />}
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
                        </>
                      ) : null}
                    </Stack>
                  ) : null}
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
                className={
                  isIssueDetail
                    ? styles.issueDetailHeader
                    : isPageOwnedHeader
                      ? styles.pageOwnedHeader
                      : undefined
                }
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Group
                  component="nav"
                  aria-label={t('nav.breadcrumb')}
                  gap="sm"
                  wrap="nowrap"
                  className={
                    isIssueDetail
                      ? styles.issueDetailBreadcrumb
                      : isPageOwnedHeader
                        ? styles.pageOwnedBreadcrumb
                        : undefined
                  }
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
                  {isCycleDetail ? (
                    <>
                      <Link
                        to="/cycles"
                        search={{ scope: 'all' }}
                        style={{
                          color: 'var(--mantine-color-dimmed)',
                          fontSize: 'var(--mantine-font-size-sm)',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('nav.cycles')}
                      </Link>
                      <IconChevronRight
                        size={14}
                        stroke={1.6}
                        aria-hidden
                        color="var(--mantine-color-dimmed)"
                      />
                      <CycleNavigationMenu
                        currentCycleName={currentCycleName}
                        opened={cycleNavigationOpen}
                        nextCycles={nextCycles}
                        previousCycles={previousCycles}
                        searchQuery={cycleNavigationQuery}
                        onOpenChange={handlers.onCycleNavigationOpenChange}
                        onSearchChange={handlers.onCycleNavigationQueryChange}
                        onNavigate={handlers.onNavigateCycle}
                      />
                    </>
                  ) : (
                    <Text size="sm" fw={500} truncate>
                      {routeTitle}
                    </Text>
                  )}
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
                    onClick={handlers.onOpenSearch}
                  >
                    <IconSearch size={15} stroke={1.7} aria-hidden />
                  </ActionIcon>
                </Group>
              </Group>
              <Box style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'auto' }}>
                {error ? (
                  <Alert
                    color="red"
                    variant="light"
                    m="sm"
                    withCloseButton
                    onClose={handlers.onDismissError}
                  >
                    {error}
                  </Alert>
                ) : null}
                <Outlet />
              </Box>
            </AppShell.Main>
          </AppShell>

          <SidebarCustomizationModal
            opened={sidebarCustomizationOpen}
            onClose={handlers.onCloseSidebarCustomization}
            groups={sidebarGroups}
            badgeStyle={sidebarBadgeStyle}
            onBadgeStyleChange={handlers.onSidebarBadgeStyleChange}
            onLocationChange={handlers.onSidebarLocationChange}
            onMove={handlers.onMoveSidebarItem}
          />

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
            size="xl"
            centered
            autoFocus={false}
          >
            <Stack gap="sm">
              <Textarea
                ref={issueTitleRef}
                data-autofocus
                rows={1}
                aria-label={t('modal.issueTitle')}
                placeholder={t('modal.issueTitle')}
                value={issueTitle}
                onChange={handlers.Issue_title_onChange12}
                onKeyDown={handlers.Issue_title_onKeyDown13}
              />
              <Textarea
                aria-label={t('modal.issueDescription')}
                placeholder={t('modal.issueDescription')}
                rows={4}
                value={model.issueBody}
                onChange={handlers.Issue_body_onChange31}
              />
              <IssueCreateProperties
                status={issueStatus}
                priority={issuePriority}
                assignee={issueAssignee}
                projectId={issueProjectId}
                estimate={model.issueEstimate}
                type={model.issueType}
                cycleId={issueCycleId}
                templateSlug={model.issueTemplateSlug}
                labelNames={model.issueLabelNames}
                workflowStatuses={model.issueWorkflowStatuses}
                projects={projects}
                cycles={cycles}
                templates={model.issueTemplates}
                labels={model.availableLabels}
                onStatusChange={handlers.Issue_status_onChange14}
                onPriorityChange={handlers.Issue_priority_onChange15}
                onAssigneeChange={handlers.Issue_assignee_onChange}
                onProjectChange={handlers.Issue_project_onChange16}
                onEstimateChange={handlers.Issue_estimate_onChange33}
                onTypeChange={handlers.Issue_type_onChange32}
                onCycleChange={handlers.Issue_cycle_onChange17}
                onTemplateChange={handlers.Issue_template_onChange30}
                onLabelsChange={handlers.Issue_labels_onChange34}
              />
              <Group justify="flex-end" align="center">
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <Button type="button" variant="default">
                      {t('issueActions.moreActions')}
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={handlers.onOpenIssueDueDate}>
                      {t('issueActions.dueDate.title')}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconRepeat size={14} aria-hidden />}
                      onClick={handlers.onEnableIssueRecurring}
                    >
                      {t('issueActions.makeRecurring')}
                    </Menu.Item>
                    <Menu.Item onClick={handlers.onOpenIssueLink}>
                      {t('issueActions.addLink')}
                    </Menu.Item>
                    <Menu.Item onClick={handlers.onOpenIssueParent}>
                      {t('issueActions.addSubIssue')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              {model.issueDueDateOpen && !model.issueRecurringOpen ? (
                <TextInput
                  type="date"
                  aria-label={t('issueProperties.dueDate')}
                  label={t('issueProperties.dueDate')}
                  value={model.issueDueDate}
                  onChange={handlers.Issue_dueDate_onChange35}
                />
              ) : null}
              {model.issueRecurringOpen ? (
                <Stack gap="xs">
                  <TextInput
                    required
                    type="date"
                    label={t('modal.firstDueDate')}
                    value={model.issueRecurringFirstDueDate}
                    onChange={handlers.onIssueRecurringFirstDueDateChange}
                  />
                  <Group grow align="flex-end">
                    <TextInput
                      required
                      type="number"
                      min={1}
                      max={365}
                      label={t('modal.repeatEvery')}
                      value={model.issueRecurringInterval}
                      onChange={handlers.onIssueRecurringIntervalChange}
                    />
                    <NativeSelect
                      aria-label={t('modal.repeatUnit')}
                      value={model.issueRecurringUnit}
                      onChange={handlers.onIssueRecurringUnitChange}
                      data={(['day', 'week', 'month', 'year'] as const).map((unit) => ({
                        value: unit,
                        label: t(`modal.${unit}`),
                      }))}
                    />
                  </Group>
                  <Button
                    type="button"
                    variant="subtle"
                    onClick={handlers.onClearIssueRecurring}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {t('issueActions.clearSchedule')}
                  </Button>
                </Stack>
              ) : null}
              {model.issueParentOpen ? (
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
              ) : null}
              {model.issueExternalLinks.length > 0 ? (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {t('issueLinks.heading')}
                  </Text>
                  <Box role="list">
                    {model.issueExternalLinks.map((link) => {
                      const title = link.title || link.url;
                      return (
                        <Group key={link.url} justify="space-between" wrap="nowrap" role="listitem">
                          <Stack gap={0} style={{ minWidth: 0 }}>
                            <Text size="sm" truncate>
                              {title}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                              {link.url}
                            </Text>
                          </Stack>
                          <Button
                            type="button"
                            variant="subtle"
                            size="compact-sm"
                            aria-label={t('issueLinks.remove', { title })}
                            onClick={() => handlers.onRemoveIssueLink(link.url)}
                          >
                            {t('issueLinks.remove', { title })}
                          </Button>
                        </Group>
                      );
                    })}
                  </Box>
                </Stack>
              ) : null}
              <Group justify="space-between" align="center">
                <FileInput
                  aria-label={t('issueAttachments.attachToNewIssue')}
                  placeholder={t('issueAttachments.attachToNewIssue')}
                  value={model.issueAttachments}
                  onChange={handlers.Issue_attachments_onChange}
                  leftSection={<IconPaperclip size={14} aria-hidden />}
                  multiple
                  clearable
                  size="xs"
                  w={290}
                />
                <Group gap="sm" align="center">
                  <Text size="sm" c="dimmed">
                    {t('modal.enterHint')}
                  </Text>
                  {!model.issueRecurringOpen ? (
                    <Checkbox
                      size="sm"
                      label={t('modal.createMore')}
                      checked={model.issueCreateMore}
                      onChange={handlers.Issue_createMore_onChange}
                    />
                  ) : null}
                  <Button
                    type="button"
                    onClick={handlers.submitIssue}
                    disabled={model.issueSubmitDisabled}
                  >
                    {model.issueRecurringOpen
                      ? t('issueActions.createRecurringIssue')
                      : t('modal.create')}
                  </Button>
                </Group>
              </Group>
              {model.issueAttachmentError ? (
                <Alert color="red" variant="light" role="alert">
                  {model.issueAttachmentError}
                </Alert>
              ) : null}
            </Stack>
          </Modal>

          <Modal
            opened={createIssue && model.issueLinkOpen}
            onClose={handlers.onCloseIssueLink}
            title={t('issueActions.addResourceTitle', { kind: t('issueLinks.link') })}
            centered
            autoFocus={false}
          >
            <Box component="form" onSubmit={handlers.onAddIssueLink}>
              <Stack>
                <TextInput
                  type="url"
                  required
                  aria-label={t('issueLinks.url')}
                  label={t('issueLinks.url')}
                  placeholder={t('issueLinks.urlPlaceholder')}
                  value={model.issueLinkURL}
                  onChange={handlers.onIssueLinkURLChange}
                />
                <TextInput
                  aria-label={t('issueLinks.title')}
                  label={t('issueLinks.title')}
                  placeholder={t('issueLinks.titlePlaceholder')}
                  value={model.issueLinkTitle}
                  onChange={handlers.onIssueLinkTitleChange}
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseIssueLink}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!model.issueLinkURL.trim()}>
                    {t('issueLinks.add')}
                  </Button>
                </Group>
              </Stack>
            </Box>
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
  const issueTitleRef = useFocusWhen<HTMLTextAreaElement>(model.createIssue, [
    model.issueCreateMoreFocusRequest,
  ]);
  const adrTitleRef = useFocusWhen<HTMLTextAreaElement>(model.createADR);
  const pageTitleRef = useFocusWhen<HTMLTextAreaElement>(model.createPage);
  return (
    <IssueWorkflowProvider>
      <ProjectWorkflowProvider>
        <ShellView
          model={{ ...model, handlers } as typeof model}
          t={t}
          issueTitleRef={issueTitleRef}
          adrTitleRef={adrTitleRef}
          pageTitleRef={pageTitleRef}
        />
      </ProjectWorkflowProvider>
    </IssueWorkflowProvider>
  );
}
