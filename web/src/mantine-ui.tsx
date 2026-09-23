import { Link, useMatchRoute, type LinkProps } from '@tanstack/react-router';
import {
  Badge,
  Box,
  Chip,
  Group,
  Kbd,
  NavLink,
  Paper,
  Stack,
  Text,
  Title,
  Typography,
  type ChipProps,
  type NavLinkProps,
} from '@mantine/core';
import type { ReactNode } from 'react';

export function RouterNavLink({
  to,
  params,
  search,
  label,
  leftSection,
  fuzzy,
  ...props
}: NavLinkProps & {
  to: LinkProps['to'];
  params?: LinkProps['params'];
  search?: LinkProps['search'];
  label: ReactNode;
  leftSection?: ReactNode;
  fuzzy?: boolean;
}) {
  const matchRoute = useMatchRoute();
  const active = !!matchRoute({ to, params, search, fuzzy });
  return (
    <RouterNavLinkView
      to={to}
      params={params}
      search={search}
      label={label}
      leftSection={leftSection}
      active={active}
      {...props}
    />
  );
}

function RouterNavLinkView({
  to,
  params,
  search,
  label,
  leftSection,
  active,
  ...props
}: NavLinkProps & {
  to: LinkProps['to'];
  params?: LinkProps['params'];
  search?: LinkProps['search'];
  label: ReactNode;
  leftSection?: ReactNode;
  active: boolean;
}) {
  return (
    <NavLink
      component={Link}
      to={to}
      params={params as never}
      search={search as never}
      label={label}
      leftSection={leftSection}
      active={active}
      {...props}
    />
  );
}

export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <Group
      component="header"
      justify="space-between"
      gap="md"
      wrap="nowrap"
      mih={42}
      px="md"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Title order={2} size="sm" fw={550} c="var(--mantine-color-text)">
        {title}
      </Title>
      {actions ? (
        <Group gap="xs" wrap="wrap" justify="flex-end">
          {actions}
        </Group>
      ) : null}
    </Group>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack
      component="section"
      gap="xs"
      pt="sm"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group justify="space-between" align="center" gap="sm">
        <Text size="sm" fw={550} c="dimmed">
          {title}
        </Text>
        {action}
      </Group>
      {children}
    </Stack>
  );
}

export function PropertyPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack component="section" aria-label={title} gap={4}>
      <Text size="sm" fw={550} c="dimmed" mb={2}>
        {title}
      </Text>
      {children}
    </Stack>
  );
}

export function PropertyRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Group gap="sm" wrap="nowrap" mih={32} px={6}>
      <Text component="span" size="xs" c="dimmed" w={66} style={{ flex: '0 0 66px' }}>
        {label}
      </Text>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Group>
  );
}

export function Pane({
  children,
  single,
  variant = 'default',
  compact,
}: {
  children: ReactNode;
  single?: boolean;
  variant?: 'default' | 'list' | 'detail';
  compact?: boolean;
}) {
  const variantStyle =
    variant === 'list'
      ? {
          flex: compact ? '0 0 320px' : '0 0 min(43%, 520px)',
          maxWidth: compact ? 380 : 560,
          minWidth: compact ? 280 : 320,
          borderRight: '1px solid var(--mantine-color-default-border)',
          padding: 0,
          display: 'flex',
          flexDirection: 'column' as const,
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-body)',
        }
      : variant === 'detail'
        ? {
            flex: '1 1 0',
            minWidth: 0,
            padding: 'var(--mantine-spacing-md)',
            overflow: 'auto',
          }
        : {
            flex: single ? '1 1 100%' : '1 1 0',
            minWidth: 0,
          };

  return (
    <Paper p={variant === 'list' ? 0 : 'md'} radius={0} bg="transparent" style={variantStyle}>
      {children}
    </Paper>
  );
}

export function SplitLayout({ children, single }: { children: ReactNode; single?: boolean }) {
  return (
    <Group
      align="stretch"
      gap={0}
      wrap={single ? 'wrap' : 'nowrap'}
      style={{ height: '100%', minHeight: 0, width: '100%' }}
    >
      {children}
    </Group>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Stack align="center" justify="center" py="xl" gap="xs">
      <Text c="dimmed" ta="center">
        {children}
      </Text>
    </Stack>
  );
}

export function Shortcut({ children }: { children: ReactNode }) {
  return <Kbd>{children}</Kbd>;
}

export function LabelChip({
  name,
  color,
  selected,
  onClick,
}: {
  name: string;
  color: string;
  selected: boolean;
  onClick: ChipProps['onClick'];
}) {
  return (
    <Chip checked={selected} onClick={onClick} variant={selected ? 'filled' : 'outline'} size="xs">
      <Group gap={6} wrap="nowrap">
        <Box
          w={8}
          h={8}
          style={{ borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
          aria-hidden
        />
        {name}
      </Group>
    </Chip>
  );
}

export function MetaBadge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <Badge variant="light" color={color ?? 'gray'} size="sm">
      {children}
    </Badge>
  );
}

export function MarkdownContent({ html }: { html: string }) {
  return (
    <Typography>
      <Box dangerouslySetInnerHTML={{ __html: html }} />
    </Typography>
  );
}
