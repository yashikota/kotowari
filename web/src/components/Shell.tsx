import { Link, Outlet } from '@tanstack/react-router';
import {
  Alert,
  ActionIcon,
  AppShell,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconChevronRight, IconMenu2, IconSearch, IconStar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { CycleNavigationMenu } from './CycleNavigationMenu.tsx';
import { IssueWorkflowProvider } from '../workflow.tsx';
import { ProjectWorkflowProvider } from '../project-workflow.tsx';
import { Palette } from './Palette.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';
import { SidebarCustomizationModal } from './SidebarCustomizationModal.tsx';
import { IssueComposerOverlays } from './IssueComposerOverlays.tsx';
import { ShellSidebar } from './ShellSidebar.tsx';
import styles from './Shell.module.css';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShellPresenter } from '../presenters/Shell.tsx';

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
        isMyIssues,
        isIssueDetail,
        showIssueViewFavorite,
        issueViewFavorite,
        isCycleDetail,
        currentCycleName,
        cycleNavigationOpen,
        cycleNavigationQuery,
        nextCycles,
        previousCycles,
        isPageOwnedHeader,
        mobileNavigationOpen,
        sidebarCollapsed,
        sidebarBadgeStyle,
        sidebarGroups,
        sidebarCustomizationOpen,
        paletteOpen,
        quickOpenTitle,
        quickOpenPlaceholder,
        quickOpenEmptyMessage,
        query,
        createADR,
        createPage,
        helpOpen,
        pageTitle,
        adrTitle,
        adrLinkIssue,
        error,
        commands,
        handlers,
      } = model;
      return (
        <>
          <AppShell
            navbar={{ width: 244, breakpoint: 0 }}
            padding={0}
            className={`${styles.shell} ${mobileNavigationOpen ? styles.navigationOpen : ''} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}
            styles={{ root: { height: '100dvh', overflow: 'hidden' } }}
          >
            <ShellSidebar model={model} t={t} />

            {mobileNavigationOpen ? (
              <button
                type="button"
                className={styles.backdrop}
                aria-label={t('nav.closeNavigation')}
                onClick={handlers.onCloseMobileNavigation}
              />
            ) : null}

            <AppShell.Main className={styles.main}>
              <Box className={styles.workspacePanel} data-testid="workspace-panel">
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
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    className={styles.collapsedSidebarToggle}
                    aria-label={t('nav.expandNavigation')}
                    title={t('nav.expandNavigation')}
                    onClick={handlers.onToggleSidebar}
                  >
                    <IconMenu2 size={16} stroke={1.7} aria-hidden />
                  </ActionIcon>
                  <Group
                    component={isMyIssues ? 'div' : 'nav'}
                    aria-label={isMyIssues ? undefined : t('nav.breadcrumb')}
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
                    {isMyIssues ? null : (
                      <>
                        <Text size="sm" c="dimmed" truncate maw={180}>
                          {workspaceName || t('workspace.defaultName')}
                        </Text>
                        <IconChevronRight
                          size={14}
                          stroke={1.6}
                          aria-hidden
                          color="var(--mantine-color-dimmed)"
                        />
                      </>
                    )}
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
                      <Text
                        component={isMyIssues || showIssueViewFavorite ? 'h2' : 'span'}
                        size="sm"
                        fw={isMyIssues || showIssueViewFavorite ? 550 : 500}
                        truncate
                      >
                        {routeTitle}
                      </Text>
                    )}
                    {showIssueViewFavorite ? (
                      <ActionIcon
                        type="button"
                        variant="subtle"
                        color={issueViewFavorite ? 'yellow' : 'gray'}
                        role="switch"
                        aria-label={t(
                          issueViewFavorite ? 'issueViewFavorite.remove' : 'issueViewFavorite.add',
                        )}
                        aria-checked={issueViewFavorite}
                        title={t(
                          issueViewFavorite ? 'issueViewFavorite.remove' : 'issueViewFavorite.add',
                        )}
                        onClick={handlers.onToggleIssueViewFavorite}
                      >
                        <IconStar
                          size={15}
                          stroke={1.7}
                          fill={issueViewFavorite ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                      </ActionIcon>
                    ) : null}
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
              title={quickOpenTitle}
              placeholder={quickOpenPlaceholder}
              emptyMessage={quickOpenEmptyMessage}
            />
          ) : null}
          {helpOpen ? <ShortcutHelp onClose={handlers.onClose9} /> : null}

          <IssueComposerOverlays model={model} t={t} issueTitleRef={issueTitleRef} />

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
