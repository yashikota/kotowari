import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type Model = Pick<
  IssueDetailModel,
  | 'applyTemplateOpen'
  | 'applyTemplateSlug'
  | 'applyTemplateTemplates'
  | 'applyTemplateSelected'
  | 'applyTemplateSaving'
  | 'handlers'
>;

export function IssueApplyTemplateDialog({ model }: { model: Model }) {
  const { t } = useTranslation();
  const {
    applyTemplateOpen,
    applyTemplateSlug,
    applyTemplateTemplates,
    applyTemplateSelected,
    applyTemplateSaving,
    handlers,
  } = model;

  return (
    <Modal
      opened={applyTemplateOpen}
      onClose={handlers.onCloseApplyTemplate}
      title={t('issueActions.applyTemplate')}
      centered
    >
      <form onSubmit={handlers.onApplyTemplate}>
        <Stack>
          {applyTemplateTemplates.length > 0 ? (
            <Select
              label={t('modal.issueTemplate')}
              placeholder={t('modal.noIssueTemplate')}
              value={applyTemplateSlug}
              data={applyTemplateTemplates.map((template) => ({
                value: template.slug,
                label: template.name,
              }))}
              onChange={handlers.onApplyTemplateChange}
              searchable
              nothingFoundMessage={t('issueActions.noIssueTemplates')}
            />
          ) : (
            <Text>{t('issueActions.noIssueTemplates')}</Text>
          )}
          {applyTemplateSelected ? (
            <>
              <Text size="sm" c="dimmed">
                {t('issueActions.applyTemplatePreview', { title: applyTemplateSelected.title })}
              </Text>
              <Text size="sm" c="dimmed">
                {t('issueActions.applyTemplateReplaces')}
              </Text>
            </>
          ) : null}
          <Group justify="flex-end">
            <Button type="button" variant="default" onClick={handlers.onCloseApplyTemplate}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={applyTemplateSaving} disabled={!applyTemplateSelected}>
              {t('issueActions.applyTemplate')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
