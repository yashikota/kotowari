import { Outlet } from '@tanstack/react-router';
import {
  Alert,
  AppShell,
  Button,
  Divider,
  Group,
  Modal,
  NativeSelect,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconBook,
  IconCircleDot,
  IconFilter,
  IconHome,
  IconLayoutKanban,
  IconListCheck,
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
            navbar={{ width: 260, breakpoint: 0 }}
            padding="md"
            styles={{ root: { height: '100dvh' } }}
          >
            <AppShell.Navbar p="md">
              <AppShell.Section>
                <Stack gap={4} mb="md">
                  <Title order={4}>{workspaceName || 'workspace'}</Title>
                </Stack>
              </AppShell.Section>

              <AppShell.Section grow component={ScrollArea}>
                <Stack gap={0} component="nav" aria-label="Primary">
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

                <Divider my="sm" />

                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Views
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
                    size="compact-sm"
                    onClick={handlers.onClick0}
                  >
                    New view
                  </Button>
                </Stack>
              </AppShell.Section>

              <AppShell.Section>
                <Divider my="sm" />
                <Stack gap={0} component="nav" aria-label="Settings">
                  <RouterNavLink
                    to={CONFIG_NAV.to}
                    label={CONFIG_NAV.label}
                    leftSection={NAV_ICONS[CONFIG_NAV.to as string]}
                  />
                </Stack>
              </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main>
              {error ? (
                <Alert color="red" variant="light" mb="md">
                  {error}
                </Alert>
              ) : null}
              <Outlet />
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
