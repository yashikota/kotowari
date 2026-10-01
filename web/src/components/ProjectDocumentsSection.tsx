import { Link } from '@tanstack/react-router';
import { Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ADR, Issue, Page } from '../types.ts';
import { MetaBadge, Section } from '../mantine-ui.tsx';

export function ProjectDocumentsSection({
  projectSlug,
  adrs,
  pages,
  issues,
  onCreateADR,
  onCreatePage,
}: {
  projectSlug: string;
  adrs: ADR[];
  pages: Page[];
  issues: Issue[];
  onCreateADR: () => void;
  onCreatePage: () => void;
}) {
  const { t } = useTranslation();
  const issueNumbers = new Set(issues.map((issue) => issue.number));
  const projectAdrs = adrs.filter(
    (adr) =>
      adr.projectSlug === projectSlug ||
      adr.issueNumbers.some((number) => issueNumbers.has(number)),
  );
  const projectPages = pages.filter((page) => page.projectSlug === projectSlug);

  return (
    <Stack gap="md" aria-label={t('ui.projectDocuments')}>
      <Section
        title={t('nav.adrs')}
        action={
          <Button type="button" variant="subtle" size="xs" onClick={onCreateADR}>
            {t('ui.newAdr')}
          </Button>
        }
      >
        <Stack component="ul" gap="xs" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {projectAdrs.map((adr) => (
            <Group component="li" key={adr.identifier} gap="xs" wrap="wrap">
              <Link to="/adrs/$identifier" params={{ identifier: adr.identifier }}>
                {adr.identifier} {adr.title}
              </Link>
              <MetaBadge>{adr.status}</MetaBadge>
            </Group>
          ))}
        </Stack>
      </Section>
      <Section
        title={t('nav.pages')}
        action={
          <Button type="button" variant="subtle" size="xs" onClick={onCreatePage}>
            {t('modal.createPage')}
          </Button>
        }
      >
        <Stack component="ul" gap="xs" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {projectPages.map((page) => (
            <Text component="li" key={page.slug} size="sm">
              <Link to="/pages/$slug" params={{ slug: page.slug }}>
                {page.title}
              </Link>
            </Text>
          ))}
        </Stack>
      </Section>
    </Stack>
  );
}
