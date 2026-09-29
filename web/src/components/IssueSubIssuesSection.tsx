import { Box, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { MetaBadge } from '../mantine-ui.tsx';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueSubIssuesHandlers = Pick<
  IssueDetailModel['handlers'],
  | 'New_sub_issue_onChange19'
  | 'New_sub_issue_onKeyDown20'
  | 'onClick18'
  | 'onCloseSubIssueEditor'
  | 'onCreateSubIssue'
  | 'onOpenSubIssueEditor'
>;
type IssueSubIssuesModel = Pick<
  IssueDetailModel,
  'children' | 'subIssueEditorOpen' | 'subTitle'
> & { handlers: IssueSubIssuesHandlers };
type Props = {
  model: IssueSubIssuesModel;
  subRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
};

export function IssueSubIssuesSection({ model, subRef }: Props) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const { children, subIssueEditorOpen, subTitle, handlers } = model;

  return (
    <Box component="section" aria-label={t('ui.subIssues')} ml={-5} pt={0} pb={10}>
      {children.length > 0 ? (
        <Stack gap="xs">
          {children.map((c) => (
            <Button
              type="button"
              variant="subtle"
              key={c.identifier}
              onClick={() => handlers.onClick18(c)}
              fullWidth
              styles={{ inner: { justifyContent: 'flex-start' } }}
            >
              <Group justify="space-between" wrap="nowrap" w="100%">
                <Group gap="sm" wrap="nowrap">
                  <Text fw={500}>{c.identifier}</Text>
                  <Text>{c.title}</Text>
                </Group>
                <MetaBadge>
                  {workflowStatusLabel(c.workflowStatus ?? c.status, workflowStatuses)}
                </MetaBadge>
              </Group>
            </Button>
          ))}
        </Stack>
      ) : null}
      {subIssueEditorOpen ? (
        <Stack gap="xs" mt={children.length > 0 ? 'xs' : 0}>
          <Textarea
            ref={subRef}
            rows={2}
            aria-label={t('ui.newSubIssue')}
            placeholder={t('ui.addSubIssue')}
            value={subTitle}
            onChange={handlers.New_sub_issue_onChange19}
            onKeyDown={handlers.New_sub_issue_onKeyDown20}
          />
          <Group justify="flex-end" gap="xs">
            <Button
              type="button"
              variant="default"
              size="xs"
              onClick={handlers.onCloseSubIssueEditor}
            >
              {t('issueSubIssues.cancel')}
            </Button>
            <Button
              type="button"
              size="xs"
              disabled={!subTitle.trim()}
              onClick={handlers.onCreateSubIssue}
            >
              {t('issueSubIssues.create')}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button
          type="button"
          variant="subtle"
          size="compact-sm"
          h={24}
          pr={13}
          styles={{ section: { marginInlineEnd: 3 } }}
          leftSection={<IconPlus size={14} stroke={1.8} aria-hidden="true" />}
          onClick={handlers.onOpenSubIssueEditor}
        >
          {t('issueSubIssues.add')}
        </Button>
      )}
    </Box>
  );
}
