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
  NativeSelect,
  ScrollArea,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import {
  IconBook,
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
  IconStack2,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { ISSUE_STATUSES } from '../types.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { RouterNavLink } from '../mantine-ui.tsx';
import { CONFIG_NAV, PRIMARY_NAV } from '../nav.ts';
import { Palette } from './Palette.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShellPresenter } from '../presenters/Shell.tsx';

const NAV_ICONS: Record<string, ReactNode> = {
  '/': <IconHome size={14} aria-hidden />,
  '/issues': <IconListCheck size={14} aria-hidden />,
  '/board': <IconLayoutKanban size={14} aria-hidden />,
  '/adrs': <IconScale size={14} aria-hidden />,
  '/projects': <IconStack2 size={14} aria-hidden />,
  '/cycles': <IconCircleDot size={14} aria-hidden />,
  '/pages': <IconBook size={14} aria-hidden />,
  '/config': <IconSettings size={14} aria-hidden />,
};

export function ShellView({ model }: { model: ReturnType<typeof useShellPresenter> }) {
  const { t } = useTranslation();
  const { createIssue, createADR, createPage, createView } = model;
  const issueTitleRef = useFocusWhen<HTMLTextAreaElement>(createIssue);
  const adrTitleRef = useFocusWhen<HTMLTextAreaElement>(createADR);
  const pageTitleRef = useFocusWhen<HTMLTextAreaElement>(createPage);
  const viewNameRef = useFocusWhen<HTMLTextAreaElement>(createView);

  switch (model._view) {
    case 0: {
      const {
        workspaceName,
        routeTitle,
        mobileNavigationOpen,
        cycles,
        views,
        paletteOpen,
        query,
        createIssue,
        createADR,
        createPage,
        createView,
        issueTitle,
        issueStatus,
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
      return (
        <>
          <AppShell
            navbar={{ width: 244, breakpoint: 0 }}
            padding={0}
            className={`linear-shell${mobileNavigationOpen ? ' linear-mobile-nav-open' : ''}`}
            styles={{ root: { height: '100dvh', overflow: 'hidden' } }}
          >
            <AppShell.Navbar
              p={0}
              className="linear-sidebar"
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest('a')) {
                  handlers.onCloseMobileNavigation();
                }
              }}
            >
              <header className="linear-sidebar-header">
                <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                  <Box className="linear-workspace-mark" aria-hidden>
                    {(workspaceName || 'K').slice(0, 1).toUpperCase()}
                  </Box>
                  <Text className="linear-workspace-name" title={workspaceName || 'Kotowari'}>
                    {workspaceName || 'Kotowari'}
                  </Text>
                </Group>
                <Group gap={2} wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="transparent"
                    className="linear-icon-button"
                    aria-label="Open command palette"
                    title="Search · Ctrl K"
                    onClick={handlers.onOpenPalette}
                  >
                    <IconSearch size={15} stroke={1.7} aria-hidden />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="transparent"
                    className="linear-icon-button"
                    aria-label={t('modal.createIssue')}
                    title={`${t('modal.createIssue')} · C`}
                    onClick={handlers.onCreateIssue}
                  >
                    <IconPlus size={16} stroke={1.7} aria-hidden />
                  </ActionIcon>
                </Group>
              </header>

              <AppShell.Section grow component={ScrollArea} className="linear-sidebar-nav">
                <Stack gap={0} component="nav" aria-label="Primary">
                  <Text className="linear-sidebar-section-title">Workspace</Text>
                  {PRIMARY_NAV.map((item) => (
                    <RouterNavLink
                      key={item.to}
                      to={item.to}
                      search={item.search}
                      params={item.params}
                      fuzzy={item.fuzzy}
                      label={item.label}
                      leftSection={NAV_ICONS[item.to as string]}
                    />
                  ))}
                  {cycles
                    .filter((c) => c.status === 'active')
                    .map((c) => (
                      <RouterNavLink
                        key={c.number}
                        to="/cycles/$number"
                        params={{ number: String(c.number) }}
                        label={`Cycle ${c.number} active`}
                        pl="xl"
                      />
                    ))}
                </Stack>

                <Divider className="linear-sidebar-divider" />

                <Stack gap={0} component="nav" aria-label="Saved views">
                  <Text className="linear-sidebar-section-title">{t('nav.views')}</Text>
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
                    size="compact-sm"
                    className="linear-new-view"
                    onClick={handlers.onClick0}
                  >
                    <Group gap={7} wrap="nowrap">
                      <IconPlus size={14} stroke={1.6} aria-hidden />
                      {t('nav.newView')}
                    </Group>
                  </Button>
                </Stack>
              </AppShell.Section>

              <AppShell.Section className="linear-sidebar-footer">
                <Stack gap={0} component="nav" aria-label="Settings">
                  <RouterNavLink
                    to={CONFIG_NAV.to}
                    label={CONFIG_NAV.label}
                    leftSection={NAV_ICONS[CONFIG_NAV.to as string]}
                  />
                </Stack>
              </AppShell.Section>
            </AppShell.Navbar>

            {mobileNavigationOpen ? (
              <button
                type="button"
                className="linear-mobile-backdrop"
                aria-label="Close navigation"
                onClick={handlers.onCloseMobileNavigation}
              />
            ) : null}

            <AppShell.Main className="linear-main">
              <header className="linear-topbar">
                <Box component="nav" aria-label="Breadcrumb" className="linear-breadcrumb">
                  <Text size="sm" c="dimmed" truncate maw={180}>
                    {workspaceName || 'Kotowari'}
                  </Text>
                  <IconChevronRight
                    size={14}
                    stroke={1.6}
                    aria-hidden
                    className="linear-breadcrumb-separator"
                  />
                  <Text className="linear-route-title">{routeTitle}</Text>
                </Box>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="transparent"
                    className="linear-icon-button linear-mobile-menu-button"
                    aria-label={mobileNavigationOpen ? 'Close navigation' : 'Open navigation'}
                    onClick={handlers.onToggleMobileNavigation}
                  >
                    <IconMenu2 size={16} stroke={1.7} aria-hidden />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="transparent"
                    className="linear-icon-button"
                    aria-label="Open command palette"
                    title="Search · Ctrl K"
                    onClick={handlers.onOpenPalette}
                  >
                    <IconSearch size={15} stroke={1.7} aria-hidden />
                  </ActionIcon>
                </Group>
              </header>
              <div className="linear-route-content">
                {error ? (
                  <Alert color="red" variant="light" m="sm">
                    {error}
                  </Alert>
                ) : null}
                <Outlet />
              </div>
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
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {t('modal.enterHint')}
                </Text>
                <Button type="button" onClick={handlers.submitIssue}>
                  {t('modal.create')}
                </Button>
              </Group>
              <Group grow align="flex-start">
                <NativeSelect
                  aria-label={t('field.status')}
                  label={t('field.status')}
                  value={issueStatus}
                  onChange={handlers.Issue_status_onChange14}
                  data={ISSUE_STATUSES.map((s) => ({ value: s, label: issueStatusLabel(s) }))}
                />
                <NativeSelect
                  aria-label={t('field.priority')}
                  label={t('field.priority')}
                  value={String(issuePriority)}
                  onChange={handlers.Issue_priority_onChange15}
                  data={[0, 1, 2, 3, 4].map((i) => ({ value: String(i), label: priorityLabel(i) }))}
                />
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
              </Group>
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
  return <ShellView model={{ ...model, handlers } as typeof model} />;
}
