import { Button, Group, Menu, Paper, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';

type Props = {
  selectedCount: number;
  archived: boolean;
  onSetStatus: (status: string) => void;
  onArchive: () => void;
  onSetPriority: (priority: number) => void;
  onClear: () => void;
};

export function IssueBoardSelectionToolbar({
  selectedCount,
  archived,
  onSetStatus,
  onArchive,
  onSetPriority,
  onClear,
}: Props) {
  const { t } = useTranslation();
  const { statuses } = useIssueWorkflow();
  return (
    <Paper
      role="group"
      aria-label={t('ui.selectedIssueCount', { count: selectedCount })}
      withBorder
      shadow="md"
      radius="md"
      p={6}
    >
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" fw={500} px="xs" style={{ whiteSpace: 'nowrap' }}>
          {t('ui.selectedIssueCount', { count: selectedCount })}
        </Text>
        <Menu position="top-end" withinPortal>
          <Menu.Target>
            <Button type="button" size="compact-sm" variant="default">
              {t('ui.issueSelectionActions')}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('field.status')}</Menu.Label>
            {statuses.map((status) => (
              <Menu.Item key={status.id} onClick={() => onSetStatus(status.id)}>
                {t('ui.setSelectedIssueStatus', {
                  status: workflowStatusLabel(status.id, statuses),
                })}
              </Menu.Item>
            ))}
            <Menu.Item onClick={onArchive}>
              {t(archived ? 'ui.restoreSelectedIssues' : 'ui.archiveSelectedIssues')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>{t('field.priority')}</Menu.Label>
            {[0, 1, 2, 3, 4].map((priority) => (
              <Menu.Item key={priority} onClick={() => onSetPriority(priority)}>
                {t('ui.setSelectedIssuePriority', { priority: priorityLabel(priority) })}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Button type="button" size="compact-sm" variant="subtle" color="gray" onClick={onClear}>
          {t('ui.clearIssueSelection')}
        </Button>
      </Group>
    </Paper>
  );
}
