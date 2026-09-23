import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Group,
  NativeSelect,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import { AIPanel } from '../components/AIPanel.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { ADR_STATUSES } from '../types.ts';
import { adrStatusLabel } from '../i18n/labels.ts';
import { EmptyState, MetaBadge, PageHeader, Pane, Shortcut, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { useADRDetailPagePresenter, useADRsPagePresenter } from '../presenters/ADRsPages.tsx';

export function ADRsPageView({ model }: { model: ReturnType<typeof useADRsPagePresenter> }) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { adrs, status, project, filtered, handlers } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title={t('nav.adrs')}
              actions={
                <Group gap="xs" wrap="wrap">
                  <NativeSelect
                    aria-label={t('ui.filterAdrStatus')}
                    value={status}
                    onChange={handlers.Filter_ADR_status_onChange0}
                    data={[
                      { value: '', label: t('ui.allStatuses') },
                      ...ADR_STATUSES.map((s) => ({ value: s, label: adrStatusLabel(s) })),
                    ]}
                  />
                  <NativeSelect
                    aria-label={t('ui.filterAdrProject')}
                    value={project}
                    onChange={handlers.Filter_ADR_project_onChange1}
                    data={[
                      { value: '', label: t('ui.allProjects') },
                      ...[...new Set(adrs.map((a) => a.projectSlug).filter(Boolean))].map((p) => ({
                        value: p!,
                        label: p!,
                      })),
                    ]}
                  />
                </Group>
              }
            />
            {adrs.length === 0 ? (
              <EmptyState>
                {t('ui.noAdrsStart')} <Shortcut>p</Shortcut> {t('ui.toCreateOne')}
              </EmptyState>
            ) : (
              <Stack gap={0} role="list">
                {filtered.map((a) => (
                  <Link
                    key={a.identifier}
                    to="/adrs/$identifier"
                    params={{ identifier: a.identifier }}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <Group
                      wrap="nowrap"
                      gap="xs"
                      py={6}
                      px="md"
                      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <Box
                        w={2}
                        h={16}
                        bg="var(--mantine-color-default-border)"
                        style={{ borderRadius: 1, flexShrink: 0 }}
                      />
                      <Text ff="monospace" size="xs" c="dimmed" w={72} style={{ flexShrink: 0 }}>
                        {a.identifier}
                      </Text>
                      <Text flex={1} truncate>
                        {a.title}
                      </Text>
                      <MetaBadge>{adrStatusLabel(a.status)}</MetaBadge>
                    </Group>
                  </Link>
                ))}
              </Stack>
            )}
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function ADRsPage() {
  return (
    <PresenterScope name="ADRsPage">
      <ADRsPageBinding />
    </PresenterScope>
  );
}

function ADRsPageBinding() {
  const model = useADRsPagePresenter();
  const handlers = useActions(model.handlers);
  return <ADRsPageView model={{ ...model, handlers } as typeof model} />;
}

export function ADRDetailPageView({
  model,
  titleRef,
}: {
  model: ReturnType<typeof useADRDetailPagePresenter>;
  titleRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        identifier,
        initial,
        allADRs,
        projects,
        adr,
        linkNumber,
        error,
        linked,
        unlinked,
        sandbox,
        handlers,
      } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title={adr.identifier}
              actions={
                <Group gap="xs" wrap="wrap">
                  <Button component="a" href={`/api/adrs/${identifier}/export`} variant="subtle">
                    {t('ui.exportWithAssets')}
                  </Button>
                  <Button type="button" onClick={handlers.onClick0}>
                    {t('ui.revisitDecision')}
                  </Button>
                  <NativeSelect
                    aria-label={t('ui.adrStatus')}
                    value={adr.status}
                    onChange={handlers.ADR_status_onChange1}
                    data={ADR_STATUSES.map((s) => ({ value: s, label: adrStatusLabel(s) }))}
                  />
                  <Button type="button" variant="subtle" onClick={handlers.onClick2}>
                    {t('ui.publish')}
                  </Button>
                </Group>
              }
            />
            <Stack gap="md">
              {error ? (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              ) : null}
              <TextInput
                ref={titleRef}
                aria-label={t('ui.adrTitle')}
                value={adr.title}
                onChange={handlers.ADR_title_onChange3}
                onBlur={handlers.ADR_title_onBlur4}
                variant="unstyled"
                styles={{
                  input: {
                    fontSize: 'var(--mantine-h3-font-size)',
                    fontWeight: 600,
                    padding: 0,
                  },
                }}
              />
              <Text size="sm" c="dimmed">
                {t('ui.sandbox')} {sandbox} {t('ui.sandboxDisclaimer')}
              </Text>
              <NativeSelect
                label={t('field.project')}
                aria-label={t('ui.adrProject')}
                value={adr.projectSlug ?? ''}
                onChange={handlers.ADR_project_onChange5}
                data={[
                  { value: '', label: t('field.noProject') },
                  ...projects.map((p) => ({ value: p.slug, label: p.name })),
                ]}
              />
              <Stack gap="xs" aria-label={t('ui.decisionHistory')}>
                <Title order={4}>{t('ui.decisionHistory')}</Title>
                <Stack gap={4} component="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {allADRs
                    .filter((a) => a.number === adr.supersedes || a.supersedes === adr.number)
                    .sort((a, b) => a.number - b.number)
                    .map((a) => (
                      <Text component="li" key={a.number} size="sm">
                        <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                          {a.identifier} {a.title}
                        </Link>{' '}
                        —{' '}
                        {a.number === adr.supersedes ? t('ui.previousDecision') : t('ui.successor')}{' '}
                        ({adrStatusLabel(a.status)})
                      </Text>
                    ))}
                </Stack>
              </Stack>
              <TextInput
                aria-label={t('ui.evaluation')}
                placeholder={t('ui.evaluationFunctionOneLine')}
                value={adr.evaluation}
                onChange={handlers.Evaluation_onChange6}
                onBlur={handlers.Evaluation_onBlur7}
              />
              <TextInput
                type="number"
                min={1}
                aria-label={t('ui.supersedesAdrNumber')}
                disabled={initial.supersedes != null}
                placeholder={t('ui.supersedesAdrNumber')}
                value={adr.supersedes ?? ''}
                onChange={handlers.Supersedes_ADR_number_onChange8}
                onBlur={handlers.Supersedes_ADR_number_onBlur9}
              />
              <AIPanel kind="adrs" id={identifier} />
              <DocumentEditor
                documentKey={`adrs/${identifier}/body`}
                assetBase={`/api/adrs/${identifier}/`}
              />
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('ui.publishMdEnglish')}
                </Text>
                <DocumentEditor
                  documentKey={`adrs/${identifier}/publishBody`}
                  assetBase={`/api/adrs/${identifier}/`}
                />
              </Stack>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('ui.linkedIssues')}
                </Text>
                {linked.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t('ui.noIssuesWorkCanStayOnAdrAlone')}
                  </Text>
                ) : (
                  <Stack gap={0} role="list">
                    {linked.map((iss) => (
                      <Group
                        key={iss.identifier}
                        wrap="nowrap"
                        gap="xs"
                        py={6}
                        px="md"
                        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                      >
                        <Link
                          to="/issues/$identifier"
                          params={{ identifier: iss.identifier }}
                          style={{
                            flexShrink: 0,
                            width: 72,
                            fontFamily: 'var(--mantine-font-family-monospace)',
                            fontSize: 'var(--mantine-font-size-xs)',
                          }}
                        >
                          {iss.identifier}
                        </Link>
                        <Text flex={1} truncate>
                          {iss.title}
                        </Text>
                        <Button
                          type="button"
                          variant="subtle"
                          size="compact-sm"
                          aria-label={t('issueADRs.unlink', { identifier: iss.identifier })}
                          onClick={() => handlers.onClick10(iss)}
                        >
                          {t('ui.unlink')}
                        </Button>
                      </Group>
                    ))}
                  </Stack>
                )}
                <Group gap="xs" wrap="wrap">
                  <NativeSelect
                    aria-label={t('ui.linkIssue')}
                    value={linkNumber}
                    onChange={handlers.Link_issue_onChange11}
                    data={[
                      { value: '', label: t('ui.chooseIssue') },
                      ...unlinked.map((iss) => ({
                        value: String(iss.number),
                        label: `${iss.identifier} ${iss.title}`,
                      })),
                    ]}
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <Button
                    type="button"
                    variant="subtle"
                    disabled={!linkNumber}
                    onClick={handlers.onClick12}
                  >
                    {t('ui.link')}
                  </Button>
                </Group>
              </Stack>
            </Stack>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function ADRDetailPage() {
  return (
    <PresenterScope name="ADRDetailPage">
      <ADRDetailPageBinding />
    </PresenterScope>
  );
}

function ADRDetailPageBinding() {
  const model = useADRDetailPagePresenter();
  const handlers = useActions(model.handlers);
  const autofocusTitle = useAutofocusTarget('title');
  const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle, [model.identifier]);
  return <ADRDetailPageView model={{ ...model, handlers } as typeof model} titleRef={titleRef} />;
}
