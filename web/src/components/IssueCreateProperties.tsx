import { MultiSelect, Select } from '@mantine/core';
import {
  IconChartBar,
  IconCircleDot,
  IconFileText,
  IconFlag,
  IconFolder,
  IconListCheck,
  IconRepeat,
  IconTag,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode, RefObject } from 'react';
import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type { Cycle, IssueTemplate, IssueWorkflowStatus, Label, Project } from '../types.ts';
import { workflowStatusLabel } from '../workflow.tsx';
import styles from './IssueCreateProperties.module.css';

function PropertySelect({
  label,
  value,
  data,
  onChange,
  icon,
  width,
  searchable = false,
  clearable = false,
  placeholder,
  autoFocus = false,
  inputRef,
}: {
  label: string;
  value: string | null;
  data: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  icon: ReactNode;
  width: number;
  searchable?: boolean;
  clearable?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      data={data}
      onChange={onChange}
      leftSection={icon}
      leftSectionWidth={28}
      size="xs"
      radius="sm"
      w={width}
      searchable={searchable}
      clearable={clearable}
      placeholder={placeholder}
      autoFocus={autoFocus}
      ref={inputRef}
      allowDeselect={false}
      comboboxProps={{ withinPortal: false, shadow: 'md' }}
      styles={{ input: { height: 34, minHeight: 34, paddingInlineStart: 32 } }}
    />
  );
}

export function IssueCreateProperties({
  status,
  priority,
  assignee,
  projectId,
  estimate,
  type,
  cycleId,
  templateSlug,
  templatePickerRequested,
  templatePickerRef,
  labelNames,
  workflowStatuses,
  projects,
  cycles,
  templates,
  labels,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onProjectChange,
  onEstimateChange,
  onTypeChange,
  onCycleChange,
  onTemplateChange,
  onLabelsChange,
}: {
  status: string;
  priority: number;
  assignee: 'self' | 'agent' | '';
  projectId: string;
  estimate: string;
  type: string | undefined;
  cycleId: string;
  templateSlug: string;
  templatePickerRequested: boolean;
  templatePickerRef: RefObject<HTMLInputElement | null>;
  labelNames: string[];
  workflowStatuses: IssueWorkflowStatus[];
  projects: Project[];
  cycles: Cycle[];
  templates: IssueTemplate[];
  labels: Label[];
  onStatusChange: (value: string | null) => void;
  onPriorityChange: (value: string | null) => void;
  onAssigneeChange: (value: string | null) => void;
  onProjectChange: (value: string | null) => void;
  onEstimateChange: (value: string | null) => void;
  onTypeChange: (value: string | null) => void;
  onCycleChange: (value: string | null) => void;
  onTemplateChange: (value: string | null) => void;
  onLabelsChange: (value: string[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('modal.issueProperties')}
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        paddingTop: 'var(--mantine-spacing-sm)',
      }}
    >
      <div className={styles.properties}>
        <PropertySelect
          label={t('field.status')}
          value={status}
          data={workflowStatuses.map((item) => ({
            value: item.id,
            label: workflowStatusLabel(item.id, workflowStatuses),
          }))}
          onChange={onStatusChange}
          icon={<IconCircleDot size={14} aria-hidden="true" />}
          width={148}
          searchable
        />
        <PropertySelect
          label={t('field.priority')}
          value={String(priority)}
          data={[0, 1, 2, 3, 4].map((item) => ({
            value: String(item),
            label: priorityLabel(item),
          }))}
          onChange={onPriorityChange}
          icon={<IconFlag size={14} aria-hidden="true" />}
          width={142}
        />
        <PropertySelect
          label={t('field.assignee')}
          value={assignee || 'none'}
          data={[
            { value: 'none', label: t('issueAssignment.unassigned') },
            { value: 'self', label: t('issueAssignment.you') },
            { value: 'agent', label: t('issueAssignment.agent') },
          ]}
          onChange={onAssigneeChange}
          icon={<IconUser size={14} aria-hidden="true" />}
          width={145}
        />
        <PropertySelect
          label={t('field.project')}
          value={projectId || 'none'}
          data={[
            { value: 'none', label: t('field.noProject') },
            ...projects.map((project) => ({ value: String(project.id), label: project.name })),
          ]}
          onChange={onProjectChange}
          icon={<IconFolder size={14} aria-hidden="true" />}
          width={160}
          searchable
        />
        <PropertySelect
          label={t('field.estimate')}
          value={estimate || 'none'}
          data={[
            { value: 'none', label: t('issueProperties.noEstimate') },
            ...[0, 1, 2, 3, 5, 8, 13, 21, 34].map((item) => ({
              value: String(item),
              label: String(item),
            })),
          ]}
          onChange={onEstimateChange}
          icon={<IconChartBar size={14} aria-hidden="true" />}
          width={125}
        />
        <MultiSelect
          aria-label={t('field.label')}
          value={labelNames}
          data={labels.map((label) => ({ value: label.name, label: label.name }))}
          onChange={onLabelsChange}
          leftSection={<IconTag size={14} aria-hidden="true" />}
          leftSectionWidth={28}
          placeholder={t('field.label')}
          size="xs"
          radius="sm"
          w={150}
          searchable
          clearable
          comboboxProps={{ withinPortal: false, shadow: 'md' }}
          styles={{ input: { minHeight: 34, paddingInlineStart: 32 } }}
        />
        <PropertySelect
          label={t('issueActions.addToCycle')}
          value={cycleId || 'none'}
          data={[
            { value: 'none', label: t('field.noCycle') },
            ...cycles.map((cycle) => ({
              value: String(cycle.id),
              label: cycle.name || t('field.cycleN', { number: cycle.number }),
            })),
          ]}
          onChange={onCycleChange}
          icon={<IconRepeat size={14} aria-hidden="true" />}
          width={130}
          searchable
        />
        <PropertySelect
          label={t('field.type')}
          value={type || 'none'}
          data={[
            { value: 'none', label: t('issueProperties.noType') },
            ...(['bug', 'feature', 'improvement', 'task'] as const).map((item) => ({
              value: item,
              label: issueTypeLabel(item),
            })),
          ]}
          onChange={onTypeChange}
          icon={<IconListCheck size={14} aria-hidden="true" />}
          width={135}
        />
        <PropertySelect
          label={t('modal.issueTemplate')}
          value={templateSlug || 'none'}
          data={templates.map((template) => ({ value: template.slug, label: template.name }))}
          onChange={onTemplateChange}
          icon={<IconFileText size={14} aria-hidden="true" />}
          width={150}
          searchable
          clearable
          autoFocus={templatePickerRequested}
          inputRef={templatePickerRef}
          placeholder={t('modal.noIssueTemplate')}
        />
      </div>
    </div>
  );
}
