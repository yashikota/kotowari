import styles from './HomePages.module.css';
import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconBrandGithub, IconLink } from '@tabler/icons-react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { Pane, SplitLayout } from '../mantine-ui.tsx';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { useHomePagePresenter } from '../presenters/HomePages.tsx';

const unstyledField = {
  input: {
    paddingInline: 0,
    minHeight: 'unset',
    border: 'none',
    background: 'transparent',
  },
} as const;

function externalHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function LinkPropertyInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  editLabel,
  editing,
  onEdit,
  onBlur,
}: {
  value: string;
  onChange: ComponentProps<typeof TextInput>['onChange'];
  placeholder: string;
  ariaLabel: string;
  editLabel: string;
  editing: boolean;
  onEdit: () => void;
  onBlur: () => void;
}) {
  const href = externalHref(value);

  if (href && !editing) {
    return (
      <Group gap={8} wrap="nowrap" justify="space-between" style={{ flex: 1, minWidth: 0 }}>
        <Anchor
          href={href}
          target="_blank"
          rel="noreferrer"
          size="sm"
          lineClamp={2}
          title={value.trim()}
          className={styles.link}
        >
          {value.trim()}
        </Anchor>
        <Button
          type="button"
          size="compact-xs"
          variant="subtle"
          color="gray"
          style={{ flexShrink: 0 }}
          onClick={onEdit}
        >
          {editLabel}
        </Button>
      </Group>
    );
  }

  return (
    <TextInput
      autoFocus={editing}
      aria-label={ariaLabel}
      variant="unstyled"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      styles={{
        input: {
          ...unstyledField.input,
          fontSize: 'var(--mantine-font-size-sm)',
        },
      }}
    />
  );
}

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <Group
      className={styles.property}
      align="flex-start"
      gap="sm"
      py={6}
      px={8}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      <Group gap={8} wrap="nowrap" w={132} style={{ flexShrink: 0 }} c="dimmed">
        {icon}
        <Text size="sm">{label}</Text>
      </Group>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Group>
  );
}

function StatLink({ to, value, label }: { to: string; value: number; label: string }) {
  return (
    <Anchor
      component={Link}
      to={to}
      underline="never"
      c="inherit"
      style={{ textDecoration: 'none' }}
    >
      <Group gap={8} wrap="nowrap">
        <Text size="lg" fw={600} lh={1}>
          {value}
        </Text>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Group>
    </Anchor>
  );
}

export function HomePageView({
  model,
  t,
}: {
  model: ReturnType<typeof useHomePagePresenter>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  switch (model._view) {
    case 0: {
      const {
        workspace,
        counts,
        error,
        saved,
        saving,
        saveError,
        urlEditing,
        githubEditing,
        resourceOpen,
        resourceURL,
        resourceTitle,
        resourceSaving,
        resourceError,
        handlers,
      } = model;

      return (
        <SplitLayout single>
          <Pane single>
            <Box maw={720} mx="auto" py={48} px="md">
              {error ? (
                <Alert color="red" variant="light" mb="lg">
                  {error}
                </Alert>
              ) : null}

              <Box component="form" onSubmit={handlers.onSubmit0}>
                <Box
                  component="fieldset"
                  disabled={saving}
                  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
                >
                  <TextInput
                    aria-label={t('config.name')}
                    variant="unstyled"
                    placeholder={t('home.namePlaceholder')}
                    value={workspace.name}
                    onChange={handlers.Workspace_name_onChange1}
                    styles={{
                      input: {
                        ...unstyledField.input,
                        fontSize: 'var(--mantine-h1-font-size)',
                        lineHeight: 1.2,
                        fontWeight: 700,
                        fontFamily: 'var(--mantine-font-family-headings)',
                      },
                    }}
                  />

                  <Stack gap={0} mt={28}>
                    <PropertyRow
                      icon={<IconLink size={16} stroke={1.5} aria-hidden />}
                      label={t('config.url')}
                    >
                      <LinkPropertyInput
                        ariaLabel={t('config.url')}
                        editLabel={t('home.editLink')}
                        placeholder={t('config.urlPlaceholder')}
                        value={workspace.url}
                        editing={urlEditing}
                        onEdit={handlers.onEditUrl}
                        onBlur={handlers.onBlurUrl}
                        onChange={handlers.Workspace_url_onChange2}
                      />
                    </PropertyRow>
                    <PropertyRow
                      icon={<IconBrandGithub size={16} stroke={1.5} aria-hidden />}
                      label={t('config.githubUrl')}
                    >
                      <LinkPropertyInput
                        ariaLabel={t('config.githubUrl')}
                        editLabel={t('home.editLink')}
                        placeholder={t('config.githubUrlPlaceholder')}
                        value={workspace.githubUrl}
                        editing={githubEditing}
                        onEdit={handlers.onEditGithub}
                        onBlur={handlers.onBlurGithub}
                        onChange={handlers.Workspace_githubUrl_onChange3}
                      />
                    </PropertyRow>
                  </Stack>

                  <Textarea
                    aria-label={t('config.description')}
                    variant="unstyled"
                    mt={32}
                    placeholder={t('config.descriptionPlaceholder')}
                    value={workspace.description}
                    onChange={handlers.Workspace_description_onChange4}
                    minRows={10}
                    autosize
                    styles={{
                      input: {
                        ...unstyledField.input,
                        fontSize: 'var(--mantine-font-size-md)',
                        lineHeight: 1.65,
                        paddingBlock: 0,
                      },
                    }}
                  />
                </Box>
                <Stack gap="sm" mt="lg">
                  <SaveFeedback
                    saving={saving}
                    saved={saved}
                    error={saveError}
                    savingLabel={t('viewSave.saving')}
                    savedLabel={t('home.saved')}
                    failureLabel={t('common.saveFailed')}
                    retryLabel={t('viewSave.retry')}
                    onRetry={handlers.onRetrySave}
                  />
                  <Group justify="flex-end">
                    <Button type="submit" loading={saving} size="sm">
                      {t('home.save')}
                    </Button>
                  </Group>
                </Stack>
              </Box>

              <Divider my={40} color="var(--mantine-color-default-border)" />

              <Group gap={32} wrap="wrap" component="section" aria-label={t('home.overview')}>
                <StatLink to="/issues" value={counts.openIssues} label={t('home.openIssues')} />
                <StatLink to="/projects" value={counts.projects} label={t('home.projects')} />
                <StatLink to="/adrs" value={counts.adrs} label={t('home.adrs')} />
                <Text size="sm" c="dimmed">
                  {t('home.totalIssues', { count: counts.issues })}
                </Text>
              </Group>

              <Stack component="section" aria-label={t('home.resources')} gap="sm" mt={40}>
                <Group justify="space-between" align="center">
                  <Text fw={600}>{t('home.resources')}</Text>
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconPlus size={16} aria-hidden />}
                    onClick={handlers.onOpenResource}
                  >
                    {t('home.addResource')}
                  </Button>
                </Group>
                {workspace.resources.length ? (
                  <Stack gap={4}>
                    {workspace.resources.map((resource) => (
                      <Group key={resource.id} justify="space-between" wrap="nowrap" gap="sm">
                        <Anchor
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          size="sm"
                          lineClamp={2}
                          title={resource.title || resource.url}
                          className={styles.link}
                        >
                          {resource.title || resource.url}
                        </Anchor>
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          style={{ flexShrink: 0 }}
                          color="gray"
                          aria-label={t('home.removeResource', {
                            title: resource.title || resource.url,
                          })}
                          onClick={() => handlers.onRemoveResource(resource.id)}
                        >
                          <IconTrash size={16} aria-hidden />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    {t('home.noResources')}
                  </Text>
                )}
              </Stack>

              <Modal
                opened={resourceOpen}
                onClose={handlers.onCloseResource}
                title={t('home.addResource')}
                closeOnEscape={!resourceSaving}
                closeOnClickOutside={!resourceSaving}
                withCloseButton={!resourceSaving}
                centered
              >
                <Box component="form" onSubmit={handlers.onCreateResource}>
                  <Stack gap="md">
                    <TextInput
                      autoFocus
                      disabled={resourceSaving}
                      required
                      type="url"
                      label={t('home.resourceURL')}
                      placeholder={t('home.resourceURLPlaceholder')}
                      value={resourceURL}
                      onChange={handlers.onResourceURLChange}
                    />
                    <TextInput
                      label={t('home.resourceTitle')}
                      disabled={resourceSaving}
                      placeholder={t('home.resourceTitlePlaceholder')}
                      value={resourceTitle}
                      onChange={handlers.onResourceTitleChange}
                    />
                    {resourceError ? (
                      <Alert color="red" role="alert" title={t('common.saveFailed')}>
                        {resourceError}
                      </Alert>
                    ) : null}
                    <Group justify="flex-end">
                      <Button
                        type="button"
                        variant="default"
                        disabled={resourceSaving}
                        onClick={handlers.onCloseResource}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" loading={resourceSaving}>
                        {t('home.addLink')}
                      </Button>
                    </Group>
                  </Stack>
                </Box>
              </Modal>
            </Box>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function HomePage() {
  return (
    <PresenterScope name="HomePage">
      <HomePageBinding />
    </PresenterScope>
  );
}

function HomePageBinding() {
  const model = useHomePagePresenter();
  const handlers = useActions(model.handlers);
  const { t } = useTranslation();
  return <HomePageView model={{ ...model, handlers } as typeof model} t={t} />;
}
