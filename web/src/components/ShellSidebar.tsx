import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  AppShell,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArchive,
  IconBell,
  IconBook,
  IconChevronRight,
  IconCircleDot,
  IconDots,
  IconFileText,
  IconFilter,
  IconGitPullRequest,
  IconHome,
  IconInbox,
  IconLayoutKanban,
  IconListCheck,
  IconMenu2,
  IconPlus,
  IconRepeat,
  IconScale,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconStack2,
  IconStar,
  IconTarget,
  IconTemplate,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { useTranslation } from 'react-i18next';
import type { useShellPresenter } from '../presenters/Shell.tsx';
import { CONFIG_NAV } from '../nav.ts';
import type { SidebarBadgeStyle, SidebarItemId } from '../preferences.ts';
import { RouterNavLink } from '../mantine-ui.tsx';
import { ViewIcon } from './ViewIcon.tsx';
import styles from './Shell.module.css';

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
  '/drafts': <IconFileText size={14} aria-hidden />,
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

type Props = {
  model: ReturnType<typeof useShellPresenter>;
  t: ReturnType<typeof useTranslation>['t'];
};

export function ShellSidebar({ model, t }: Props) {
  const {
    workspaceName,
    moreLinksOpen,
    sidebarNavigation,
    sidebarBadgeCounts,
    sidebarBadgeStyle,
    cycles,
    views,
    favoriteIssues,
    favoriteIssueViews,
    currentCycleStatus,
    cycleListScope,
    isCycleList,
  } = model;
  const { handlers } = model;
  const favoriteCycles = cycles.filter((cycle) => cycle.isFavorite);
  const favoriteProjects = model.projects.filter((project) => project.isFavorite);
  const favoriteViews = views.filter((view) => view.isFavorite);
  const sidebarBadge = (id: SidebarItemId) => {
    const count = sidebarBadgeCounts[id] ?? 0;
    if (!count) return undefined;
    const label =
      id === '/inbox'
        ? t('nav.unreadCount', { count })
        : id === '/drafts'
          ? t('nav.draftCount', { count })
          : t('nav.reviewCount', { count });
    return <SidebarBadge count={count} style={sidebarBadgeStyle} label={label} />;
  };

  return (
    <AppShell.Navbar
      p={0}
      className={styles.sidebar}
      styles={{
        navbar: {
          backgroundColor: 'var(--mantine-color-gray-1)',
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
        <ActionIcon
          type="button"
          variant="subtle"
          color="gray"
          className={styles.sidebarToggleButton}
          aria-label={t('nav.collapseNavigation')}
          title={t('nav.collapseNavigation')}
          onClick={handlers.onToggleSidebar}
        >
          <IconMenu2 size={16} stroke={1.7} aria-hidden />
        </ActionIcon>
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
                          active={isCycleList}
                        />
                        <Stack
                          component="div"
                          role="group"
                          aria-label={t('nav.cycleNavigation')}
                          gap={0}
                          pl="xl"
                        >
                          <RouterNavLink
                            to="/cycles/$number"
                            params={{ number: 'active' }}
                            label={t('nav.cycleCurrent')}
                            active={currentCycleStatus === 'active' || cycleListScope === 'current'}
                          />
                          <RouterNavLink
                            to="/cycles/$number"
                            params={{ number: 'upcoming' }}
                            label={t('nav.cycleUpcoming')}
                            active={
                              currentCycleStatus === 'upcoming' || cycleListScope === 'upcoming'
                            }
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
  );
}
