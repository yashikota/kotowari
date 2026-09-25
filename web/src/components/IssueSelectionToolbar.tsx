import { Button, Group, Menu, Paper, Text, TextInput } from '@mantine/core';
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
  const dueDatePresetLabels = {
    today: t('ui.bulkDueDateToday'),
    tomorrow: t('ui.bulkDueDateTomorrow'),
    nextWeek: t('ui.bulkDueDateNextWeek'),
  };
  const {
    selectedCount,
    statuses,
    priorities,
    types,
    estimates,
    dueDateDraft,
    dueDatePresets,
    projects,
    cycles,
    labels,
    handlers,
  } = model;
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
            <Menu.Sub position="left-start" openDelay={100} closeDelay={150}>
              <Menu.Sub.Target>
                <Menu.Sub.Item>{t('ui.bulkProject')}</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown style={{ maxHeight: 'min(55vh, 380px)', overflowY: 'auto' }}>
                <Menu.Item onClick={() => handlers.onSetProject(null)}>
                  {t('field.noProject')}
                </Menu.Item>
                {projects.map((project) => (
                  <Menu.Item key={project.id} onClick={() => handlers.onSetProject(project.id)}>
                    {project.name}
                  </Menu.Item>
                ))}
              </Menu.Sub.Dropdown>
            </Menu.Sub>
            <Menu.Sub position="left-start" openDelay={100} closeDelay={150}>
              <Menu.Sub.Target>
                <Menu.Sub.Item>{t('ui.bulkLabels')}</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown style={{ maxHeight: 'min(55vh, 380px)', overflowY: 'auto' }}>
                <Menu.Label>{t('ui.bulkAddLabel')}</Menu.Label>
                {labels.length === 0 ? (
                  <Menu.Item disabled>{t('issueProperties.noLabels')}</Menu.Item>
                ) : (
                  labels.map((label) => (
                    <Menu.Item
                      key={`add-${label.id}`}
                      aria-label={t('ui.addSelectedIssueLabel', { label: label.name })}
                      onClick={() => handlers.onAddLabel(label.id)}
                    >
                      {label.name}
                    </Menu.Item>
                  ))
                )}
                {labels.length > 0 ? <Menu.Divider /> : null}
                <Menu.Label>{t('ui.bulkRemoveLabel')}</Menu.Label>
                {labels.length === 0 ? (
                  <Menu.Item disabled>{t('issueProperties.noLabels')}</Menu.Item>
                ) : (
                  labels.map((label) => (
                    <Menu.Item
                      key={`remove-${label.id}`}
                      aria-label={t('ui.removeSelectedIssueLabel', { label: label.name })}
                      onClick={() => handlers.onRemoveLabel(label.id)}
                    >
                      {label.name}
                    </Menu.Item>
                  ))
                )}
              </Menu.Sub.Dropdown>
            </Menu.Sub>
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
            <Menu.Sub position="left-start" openDelay={100} closeDelay={150}>
              <Menu.Sub.Target>
                <Menu.Sub.Item>{t('ui.bulkCycle')}</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown style={{ maxHeight: 'min(55vh, 380px)', overflowY: 'auto' }}>
                <Menu.Item onClick={() => handlers.onSetCycle(null)}>
                  {t('field.noCycle')}
                </Menu.Item>
                {cycles.map((cycle) => (
                  <Menu.Item key={cycle.id} onClick={() => handlers.onSetCycle(cycle.id)}>
                    {cycle.name || t('field.cycleN', { number: cycle.number })}
                  </Menu.Item>
                ))}
              </Menu.Sub.Dropdown>
            </Menu.Sub>
            <Menu.Sub position="left-start" openDelay={100} closeDelay={150}>
              <Menu.Sub.Target>
                <Menu.Sub.Item>{t('ui.bulkDueDate')}</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown style={{ maxHeight: 'min(55vh, 380px)', overflowY: 'auto' }}>
                <Menu.Item onClick={() => handlers.onSetDueDate(null)}>
                  {t('issueProperties.noDueDate')}
                </Menu.Item>
                {dueDatePresets.map((preset) => (
                  <Menu.Item key={preset.value} onClick={() => handlers.onSetDueDate(preset.value)}>
                    {dueDatePresetLabels[preset.key]}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Label>{t('ui.bulkDueDateCustom')}</Menu.Label>
                <Group px="xs" pb="xs" wrap="nowrap" align="end">
                  <TextInput
                    type="date"
                    aria-label={t('ui.bulkDueDateCustom')}
                    value={dueDateDraft}
                    onChange={(event) => handlers.onDueDateChange(event.currentTarget.value)}
                    size="xs"
                    style={{ minWidth: 0, flex: 1 }}
                  />
                  <Button
                    type="button"
                    size="compact-xs"
                    onClick={() => handlers.onSetDueDate(dueDateDraft || null)}
                    disabled={!dueDateDraft}
                  >
                    {t('searchPage.filters.apply')}
                  </Button>
                </Group>
              </Menu.Sub.Dropdown>
            </Menu.Sub>
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
