import { ActionIcon, Button, Group, Menu, Stack } from '@mantine/core';
import { IconExternalLink, IconFileText, IconTrash } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { IssueLink } from '../types.ts';
import { MetaBadge } from '../mantine-ui.tsx';

type ResourceView = IssueLink & { pageSlug: string | null; displayTitle: string };

export function CycleResourcesSection({
  resources,
  onCreateDocument,
  onOpenAddLink,
  onRemove,
}: {
  resources: ResourceView[];
  onCreateDocument: () => void;
  onOpenAddLink: () => void;
  onRemove: (resourceId: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <Stack component="section" aria-label={t('cycle.resourcesHeading')} gap="sm">
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        <Menu withinPortal shadow="md" position="bottom-end">
          <Menu.Target>
            <Button type="button" size="compact-sm" variant="subtle">
              {t('cycle.addDocumentOrLink')}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={onCreateDocument}>{t('cycle.createDocument')}</Menu.Item>
            <Menu.Item onClick={onOpenAddLink}>{t('cycle.addLink')}</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      {resources.length > 0 ? (
        <Stack gap="xs" role="list" aria-label={t('cycle.resourcesHeading')}>
          {resources.map((resource) => (
            <Group key={resource.id} justify="space-between" wrap="nowrap" role="listitem">
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                {resource.pageSlug ? (
                  <IconFileText size={15} aria-hidden="true" />
                ) : (
                  <IconExternalLink size={15} aria-hidden="true" />
                )}
                {resource.pageSlug ? (
                  <Link to="/pages/$slug" params={{ slug: resource.pageSlug }}>
                    {resource.displayTitle}
                  </Link>
                ) : (
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    {resource.displayTitle}
                  </a>
                )}
                <MetaBadge>{t(`issueLinks.${resource.kind}`)}</MetaBadge>
              </Group>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('cycle.removeResource', { title: resource.displayTitle })}
                onClick={() => onRemove(resource.id)}
              >
                <IconTrash size={15} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
