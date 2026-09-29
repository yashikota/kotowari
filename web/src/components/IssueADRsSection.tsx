import { Link } from '@tanstack/react-router';
import { Button, Group, NativeSelect, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { MetaBadge, Section } from '../mantine-ui.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueADRsHandlers = Pick<
  IssueDetailModel['handlers'],
  'Link_ADR_onChange15' | 'onClick14' | 'onClick16' | 'onClick17'
>;
type IssueADRsModel = Pick<IssueDetailModel, 'adrPick' | 'linkedAdrs' | 'unlinkedAdrs'> & {
  handlers: IssueADRsHandlers;
};

export function IssueADRsSection({ model }: { model: IssueADRsModel }) {
  const { t } = useTranslation();
  const { adrPick, linkedAdrs, unlinkedAdrs, handlers } = model;

  return (
    <Section title={t('nav.adrs')}>
      {linkedAdrs.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t('ui.noLinkedDecisions')}
        </Text>
      ) : (
        <Stack gap="xs" role="list">
          {linkedAdrs.map((a) => (
            <Group key={a.identifier} justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                  {a.identifier}
                </Link>
                <Text>{a.title}</Text>
                <MetaBadge>{a.status}</MetaBadge>
              </Group>
              <Button
                type="button"
                variant="subtle"
                aria-label={t('issueADRs.unlink', { identifier: a.identifier })}
                onClick={() => handlers.onClick14(a)}
              >
                {t('ui.unlink')}
              </Button>
            </Group>
          ))}
        </Stack>
      )}
      <Group align="flex-end" wrap="wrap">
        <NativeSelect
          aria-label={t('ui.linkAdr')}
          value={adrPick}
          onChange={handlers.Link_ADR_onChange15}
          data={[
            { value: '', label: t('issueADRs.choose') },
            ...unlinkedAdrs.map((a) => ({
              value: String(a.number),
              label: `${a.identifier} ${a.title}`,
            })),
          ]}
          style={{ flex: 1, minWidth: 200 }}
        />
        <Button type="button" variant="subtle" disabled={!adrPick} onClick={handlers.onClick16}>
          {t('ui.link')}
        </Button>
        <Button type="button" variant="subtle" onClick={handlers.onClick17}>
          {t('ui.newAdr')}
        </Button>
      </Group>
    </Section>
  );
}
