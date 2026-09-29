import { Link } from '@tanstack/react-router';
import { ActionIcon, Box, Button, Group, Menu, Stack } from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconFileText,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MetaBadge, Section } from '../mantine-ui.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueResourcesHandlers = Pick<
  IssueDetailModel['handlers'],
  | 'Create_document_onClick44'
  | 'onOpenExternalLink'
  | 'onRemoveExternalLink28'
  | 'onToggleResources'
>;
type IssueResourcesModel = Pick<IssueDetailModel, 'pages' | 'resourcesCollapsed'> & {
  issue: Pick<IssueDetailModel['issue'], 'externalLinks'>;
  handlers: IssueResourcesHandlers;
};

export function IssueResourcesSection({ model }: { model: IssueResourcesModel }) {
  const { t } = useTranslation();
  const { issue, pages, resourcesCollapsed, handlers } = model;

  return (
    <>
      {' '}
      {issue.externalLinks.length > 0 ? (
        <Section
          title={t('issueLinks.resourcesHeading')}
          ariaLabel={t('issueLinks.resourcesHeading')}
          action={
            <Group gap={4}>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={
                  resourcesCollapsed
                    ? t('issueLinks.expandResources')
                    : t('issueLinks.collapseResources')
                }
                aria-expanded={!resourcesCollapsed}
                aria-controls="issue-resources-content"
                onClick={handlers.onToggleResources}
              >
                {resourcesCollapsed ? (
                  <IconChevronRight size={14} stroke={1.8} aria-hidden="true" />
                ) : (
                  <IconChevronDown size={14} stroke={1.8} aria-hidden="true" />
                )}
              </ActionIcon>
              <Menu position="bottom-end" shadow="md" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    aria-label={t('issueLinks.addResource')}
                    title={t('issueLinks.addResource')}
                  >
                    <IconPlus size={15} stroke={1.8} aria-hidden="true" />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown aria-label={t('issueLinks.addResource')}>
                  <Menu.Item onClick={() => handlers.onOpenExternalLink('link')}>
                    {t('issueActions.addLink')}
                  </Menu.Item>
                  <Menu.Item onClick={() => handlers.onOpenExternalLink('pullRequest')}>
                    {t('issueActions.addPullRequest')}
                  </Menu.Item>
                  <Menu.Item onClick={handlers.Create_document_onClick44}>
                    {t('issueActions.addDocument')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          }
        >
          {resourcesCollapsed ? null : (
            <Box id="issue-resources-content">
              <Stack gap="xs" role="list" aria-label={t('issueLinks.heading')}>
                {issue.externalLinks.map((link) => {
                  let pageSlug: string | null = null;
                  try {
                    const url = new URL(link.url);
                    const pageMarker = '/pages/';
                    const markerIndex = url.pathname.lastIndexOf(pageMarker);
                    if (url.origin === window.location.origin && markerIndex >= 0) {
                      const candidate = url.pathname.slice(markerIndex + pageMarker.length);
                      if (candidate && !candidate.includes('/')) {
                        pageSlug = decodeURIComponent(candidate);
                      }
                    }
                  } catch {
                    pageSlug = null;
                  }
                  const page = pageSlug ? pages.find((item) => item.slug === pageSlug) : null;
                  const title = page?.title || link.title || link.url;
                  return (
                    <Group key={link.id} justify="space-between" wrap="nowrap" role="listitem">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        {pageSlug ? (
                          <IconFileText size={15} stroke={1.7} aria-hidden="true" />
                        ) : (
                          <IconExternalLink size={15} stroke={1.7} aria-hidden="true" />
                        )}
                        {pageSlug ? (
                          <Link to="/pages/$slug" params={{ slug: pageSlug }}>
                            {title}
                          </Link>
                        ) : (
                          <a href={link.url} target="_blank" rel="noreferrer">
                            {title}
                          </a>
                        )}
                        <MetaBadge>{t(`issueLinks.${link.kind}`)}</MetaBadge>
                      </Group>
                      <Button
                        type="button"
                        variant="subtle"
                        color="gray"
                        size="compact-sm"
                        aria-label={t('issueLinks.remove', { title })}
                        onClick={() => handlers.onRemoveExternalLink28(link)}
                      >
                        <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                      </Button>
                    </Group>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Section>
      ) : null}
    </>
  );
}
