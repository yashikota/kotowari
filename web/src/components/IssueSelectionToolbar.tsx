import { Button, Group, Menu, Paper, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueSelectionToolbarPresenter } from '../presenters/IssueSelectionToolbar.ts';
import styles from './IssueSelectionToolbar.module.css';

type Props = Parameters<typeof useIssueSelectionToolbarPresenter>[0];

function IssueSelectionToolbarView({
  model,
}: {
  model: ReturnType<typeof useIssueSelectionToolbarPresenter>;
}) {
  const { t } = useTranslation();
  const { selectedCount, statuses, priorities, types, estimates, handlers } = model;
  return (
    <Paper
      className={styles.toolbar}
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
          <Menu.Dropdown style={{ maxHeight: 'min(60vh, 420px)', overflowY: 'auto' }}>
            <Menu.Label>{t('field.status')}</Menu.Label>
            {statuses.map((status) => (
              <Menu.Item key={status.id} onClick={() => handlers.onSetStatus(status.id)}>
                {t('ui.setSelectedIssueStatus', { status: status.label })}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>{t('field.priority')}</Menu.Label>
            {priorities.map((priority) => (
              <Menu.Item
                key={priority.value}
                onClick={() => handlers.onSetPriority(priority.value)}
              >
                {t('ui.setSelectedIssuePriority', { priority: priority.label })}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>{t('field.assignee')}</Menu.Label>
            <Menu.Item onClick={() => handlers.onSetAssignee('self')}>
              {t('ui.assignSelectedIssuesToMe')}
            </Menu.Item>
            <Menu.Item onClick={() => handlers.onSetAssignee('')}>
              {t('ui.unassignSelectedIssues')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>{t('field.type')}</Menu.Label>
            {types.map((type) => (
              <Menu.Item key={type.value} onClick={() => handlers.onSetType(type.value)}>
                {t('ui.setSelectedIssueType', { type: type.label })}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>{t('field.estimate')}</Menu.Label>
            {estimates.map((estimate) => (
              <Menu.Item
                key={estimate.value ?? 'none'}
                onClick={() => handlers.onSetEstimate(estimate.value)}
              >
                {t('ui.setSelectedIssueEstimate', {
                  estimate:
                    estimate.value == null ? t('issueProperties.noEstimate') : estimate.label,
                })}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Button
          type="button"
          size="compact-sm"
          variant="subtle"
          color="gray"
          onClick={handlers.onClear}
        >
          {t('ui.clearIssueSelection')}
        </Button>
      </Group>
    </Paper>
  );
}

export function IssueSelectionToolbar(props: Props) {
  return (
    <PresenterScope name="IssueSelectionToolbar">
      <IssueSelectionToolbarBinding {...props} />
    </PresenterScope>
  );
}

function IssueSelectionToolbarBinding(props: Props) {
  const model = useIssueSelectionToolbarPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueSelectionToolbarView model={{ ...model, handlers } as typeof model} />;
}
