import { Link } from '@tanstack/react-router';
import { Box, Button, Group, NativeSelect, Stack } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MetaBadge } from '../mantine-ui.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueRelationsHandlers = Pick<
  IssueDetailModel['handlers'],
  | 'Relation_kind_onChange31'
  | 'Relation_onSubmit32'
  | 'Relation_target_onChange30'
  | 'onCloseRelationsEditor'
  | 'onRemoveRelation33'
>;
type IssueRelationsModel = Pick<
  IssueDetailModel,
  | 'relationIssues'
  | 'relationsEditorOpen'
  | 'relationKind'
  | 'relationTarget'
  | 'relationTargetOptions'
> & { handlers: IssueRelationsHandlers };

export function IssueRelationsSection({ model }: { model: IssueRelationsModel }) {
  const { t } = useTranslation();
  const {
    relationIssues,
    relationsEditorOpen,
    relationKind,
    relationTarget,
    relationTargetOptions,
    handlers,
  } = model;

  return (
    <>
      {' '}
      {relationIssues.length > 0 || relationsEditorOpen ? (
        <Box component="section" aria-label={t('issueRelations.heading')} py="xs">
          {relationIssues.length > 0 ? (
            <Stack gap="xs" role="list" aria-label={t('issueRelations.heading')}>
              {relationIssues.map(({ relation, target }) => (
                <Group key={relation.id} justify="space-between" wrap="nowrap" role="listitem">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <MetaBadge>{t(`issueRelations.${relation.kind}`)}</MetaBadge>
                    <Link to="/issues/$identifier" params={{ identifier: target.identifier }}>
                      {target.identifier} {target.title}
                    </Link>
                  </Group>
                  <Button
                    type="button"
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    aria-label={t('issueRelations.remove', {
                      identifier: target.identifier,
                    })}
                    onClick={() => handlers.onRemoveRelation33(relation)}
                  >
                    <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                  </Button>
                </Group>
              ))}
            </Stack>
          ) : null}
          {relationsEditorOpen ? (
            <form onSubmit={handlers.Relation_onSubmit32}>
              <Stack gap="xs">
                <Group align="flex-end" wrap="wrap">
                  <NativeSelect
                    aria-label={t('issueRelations.kindLabel')}
                    value={relationKind}
                    onChange={handlers.Relation_kind_onChange31}
                    data={(['related', 'blocks', 'blockedBy', 'duplicateOf'] as const).map(
                      (kind) => ({
                        value: kind,
                        label: t(`issueRelations.${kind}`),
                      }),
                    )}
                  />
                  <NativeSelect
                    aria-label={t('issueRelations.issueLabel')}
                    value={relationTarget}
                    onChange={handlers.Relation_target_onChange30}
                    data={[
                      { value: '', label: t('issueRelations.chooseIssue') },
                      ...relationTargetOptions.map((candidate) => ({
                        value: candidate.identifier,
                        label: `${candidate.identifier} ${candidate.title}`,
                      })),
                    ]}
                    style={{ flex: '1 1 240px' }}
                  />
                </Group>
                <Group justify="flex-end" gap="xs">
                  <Button
                    type="button"
                    variant="default"
                    size="xs"
                    onClick={handlers.onCloseRelationsEditor}
                  >
                    {t('issueSubIssues.cancel')}
                  </Button>
                  <Button type="submit" size="xs" disabled={!relationTarget}>
                    {t('issueRelations.add')}
                  </Button>
                </Group>
              </Stack>
            </form>
          ) : null}
        </Box>
      ) : null}
    </>
  );
}
