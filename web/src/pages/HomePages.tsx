import { Link } from '@tanstack/react-router';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconBrandGithub, IconLink } from '@tabler/icons-react';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { Pane, SplitLayout } from '../mantine-ui.tsx';
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
}: {
  value: string;
  onChange: ComponentProps<typeof TextInput>['onChange'];
  placeholder: string;
  ariaLabel: string;
  editLabel: string;
}) {
  const href = externalHref(value);
  const [editing, setEditing] = useState(false);

  if (href && !editing) {
    return (
      <Group gap={8} wrap="nowrap" justify="space-between" style={{ flex: 1, minWidth: 0 }}>
        <Anchor
          href={href}
          target="_blank"
          rel="noreferrer"
          size="sm"
          truncate
          style={{ flex: 1, minWidth: 0 }}
        >
          {value.trim()}
        </Anchor>
        <Text
          component="button"
          type="button"
          size="xs"
          c="dimmed"
          style={{ border: 0, background: 'none', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => setEditing(true)}
        >
          {editLabel}
        </Text>
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
      onBlur={() => setEditing(false)}
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
      wrap="nowrap"
      align="flex-start"
      gap="sm"
      py={6}
      px={8}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        transition: 'background-color 120ms ease',
      }}
      className="home-property-row"
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

export function HomePageView({ model }: { model: ReturnType<typeof useHomePagePresenter> }) {
  const { t } = useTranslation();

  switch (model._view) {
    case 0: {
      const { workspace, counts, error, saved, handlers } = model;

      return (
        <SplitLayout single>
          <Pane single>
            <Box component="style">{`
              .home-property-row:hover {
                background: light-dark(
                  var(--mantine-color-gray-0),
                  var(--mantine-color-dark-6)
                );
              }
            `}</Box>

            <Box maw={720} mx="auto" py={48} px="md">
              {error ? (
                <Alert color="red" variant="light" mb="lg">
                  {error}
                </Alert>
              ) : null}

              <Box component="form" onSubmit={handlers.onSubmit0}>
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

                <Group justify="space-between" align="center" mt="lg">
                  <Text size="xs" c={saved ? 'dimmed' : 'transparent'} aria-live="polite">
                    {t('home.saved')}
                  </Text>
                  <Button type="submit" variant="subtle" size="compact-sm" color="gray">
                    {t('home.save')}
                  </Button>
                </Group>
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
  return <HomePageView model={{ ...model, handlers } as typeof model} />;
}
