import { ActionIcon, Box, Menu, TextInput } from '@mantine/core';
import {
  IconCalendarEvent,
  IconCheck,
  IconFlag,
  IconGitBranch,
  IconPlus,
  IconTag,
} from '@tabler/icons-react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  IssueOptionalProperty,
  OptionalIssuePropertyVisibility,
} from '../issue-property-model.ts';
import type { Issue, ProjectMilestone } from '../types.ts';
import styles from './IssuePropertiesPanel.module.css';
import { IssuePropertyRow, IssuePropertySelect } from './IssuePropertyControls.tsx';

export function IssueOptionalProperties({
  issue,
  visibility,
  due,
  milestones,
  parentOptions,
  onTypeChange,
  onParentChange,
  onDueDateChange,
  onMilestoneChange,
  onToggleProperty,
}: {
  issue: Issue;
  visibility: OptionalIssuePropertyVisibility;
  due: string;
  milestones: ProjectMilestone[];
  parentOptions: Issue[];
  onTypeChange: (value: string | null) => void;
  onParentChange: (value: string | null) => void;
  onDueDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMilestoneChange: (value: string | null) => void;
  onToggleProperty: (property: IssueOptionalProperty) => void;
}) {
  const { t } = useTranslation();
  const optionalProperties: Array<{
    key: IssueOptionalProperty;
    label: string;
    disabled: boolean;
  }> = [
    { key: 'dueDate', label: t('issueProperties.dueDate'), disabled: false },
    { key: 'type', label: t('field.type'), disabled: false },
    {
      key: 'milestone',
      label: t('field.milestone'),
      disabled: !visibility.milestone && (issue.projectId == null || milestones.length === 0),
    },
    {
      key: 'parent',
      label: t('issueProperties.parent'),
      disabled: !visibility.parent && parentOptions.length === 0,
    },
  ];

  return (
    <Box
      role="group"
      aria-label={t('issueProperties.optionalProperties')}
      className={styles.optionalProperties}
    >
      {visibility.type ? (
        <IssuePropertyRow label={t('field.type')} icon={<IconTag size={14} stroke={1.7} />}>
          <IssuePropertySelect
            compactChars={12}
            compactLabel={issue.type ? t(`issueType.${issue.type}`) : t('issueProperties.noType')}
            aria-label={t('field.type')}
            value={issue.type ?? 'none'}
            onChange={onTypeChange}
            data={[
              { value: 'none', label: t('issueProperties.noType') },
              ...(['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
                value: type,
                label: t(`issueType.${type}`),
              })),
            ]}
          />
        </IssuePropertyRow>
      ) : null}

      {visibility.parent ? (
        <IssuePropertyRow
          label={t('issueProperties.parent')}
          icon={<IconGitBranch size={14} stroke={1.7} />}
        >
          <IssuePropertySelect
            compactChars={14}
            compactLabel={
              parentOptions.find((parent) => parent.id === issue.parentId)?.identifier ??
              t('issueProperties.noParent')
            }
            aria-label={t('issueProperties.parent')}
            value={issue.parentId != null ? String(issue.parentId) : 'none'}
            onChange={onParentChange}
            data={[
              { value: 'none', label: t('issueProperties.noParent') },
              ...parentOptions.map((parent) => ({
                value: String(parent.id),
                label: `${parent.identifier} ${parent.title}`,
              })),
            ]}
            searchable
            nothingFoundMessage={t('issueProperties.noIssuesFound')}
          />
        </IssuePropertyRow>
      ) : null}

      {visibility.dueDate ? (
        <IssuePropertyRow
          label={t('issueProperties.dueDate')}
          icon={<IconCalendarEvent size={14} stroke={1.7} />}
          className={styles.dueDateRow}
        >
          <TextInput
            size="sm"
            type="date"
            aria-label={t('issueProperties.dueDate')}
            value={due}
            onChange={onDueDateChange}
            classNames={{ input: styles.input, root: styles.dateInput }}
          />
        </IssuePropertyRow>
      ) : null}

      {visibility.milestone ? (
        <IssuePropertyRow label={t('field.milestone')} icon={<IconFlag size={14} stroke={1.7} />}>
          <IssuePropertySelect
            compactChars={14}
            compactLabel={
              milestones.find((milestone) => milestone.id === issue.milestoneId)?.name ??
              t('issueProperties.noMilestone')
            }
            aria-label={t('field.milestone')}
            value={issue.milestoneId != null ? String(issue.milestoneId) : 'none'}
            onChange={onMilestoneChange}
            data={[
              { value: 'none', label: t('issueProperties.noMilestone') },
              ...milestones.map((milestone) => ({
                value: String(milestone.id),
                label: milestone.name,
              })),
            ]}
            searchable
            disabled={issue.projectId == null || milestones.length === 0}
            nothingFoundMessage={t('issueProperties.noMilestonesFound')}
          />
        </IssuePropertyRow>
      ) : null}

      <Menu position="bottom-start" withinPortal>
        <Menu.Target>
          <ActionIcon
            type="button"
            variant="subtle"
            color="gray"
            size="sm"
            className={styles.addPropertyButton}
            aria-label={t('issueProperties.addProperty')}
            title={t('issueProperties.addProperty')}
          >
            <IconPlus size={14} stroke={1.8} aria-hidden="true" />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown aria-label={t('issueProperties.addProperty')}>
          <Menu.Label>{t('issueProperties.optionalProperties')}</Menu.Label>
          {optionalProperties.map(({ key, label, disabled }) => {
            const visible = visibility[key];
            return (
              <Menu.Item
                key={key}
                aria-pressed={visible}
                disabled={disabled}
                rightSection={visible ? <IconCheck size={14} aria-hidden="true" /> : null}
                onClick={() => onToggleProperty(key)}
              >
                {label}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
