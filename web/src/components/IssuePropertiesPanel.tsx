import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
  type SelectProps,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconChartBar,
  IconCheck,
  IconFolder,
  IconFlag,
  IconGitBranch,
  IconPlus,
  IconRefresh,
  IconTag,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssuePropertiesPanel.module.css';
import type { IssueOptionalProperty, useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;

export function IssuePropertiesPanel({
  model,
}: {
  model: Pick<
    IssueDetailModel,
    | 'issue'
    | 'optionalIssuePropertyVisibility'
    | 'projects'
    | 'milestones'
    | 'cycles'
    | 'parentOptions'
    | 'labels'
    | 'selectedLabelIds'
    | 'labelName'
    | 'due'
    | 'handlers'
  >;
}) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const {
    issue,
    optionalIssuePropertyVisibility,
    projects,
    milestones,
    cycles,
    parentOptions,
    labels,
    selectedLabelIds,
    labelName,
    due,
    handlers,
  } = model;
  const selectedLabels = labels.filter((label) => selectedLabelIds.has(label.id));
  const statusLabel = workflowStatusLabel(issue.workflowStatus ?? issue.status, workflowStatuses);
  const priorityValueLabel = priorityLabel(issue.priority);
  const assigneeValueLabel =
    issue.assignee === 'self'
      ? t('issueAssignment.you')
      : issue.assignee === 'agent'
        ? t('issueAssignment.agent')
        : t('issueAssignment.unassigned');
  const projectValueLabel =
    projects.find((project) => project.id === issue.projectId)?.name ?? t('field.project');
  const estimateValueLabel =
    issue.estimate == null ? t('issueProperties.noEstimate') : String(issue.estimate);
  const currentCycle = cycles.find((cycle) => cycle.id === issue.cycleId);
  const cycleValueLabel = currentCycle
    ? t('field.cycleN', { number: currentCycle.number })
    : t('field.noCycle');
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
      disabled:
        !optionalIssuePropertyVisibility.milestone &&
        (issue.projectId == null || milestones.length === 0),
    },
    {
      key: 'parent',
      label: t('issueProperties.parent'),
      disabled: !optionalIssuePropertyVisibility.parent && parentOptions.length === 0,
    },
  ];

  return (
    <Box component="section" aria-label={t('issueProperties.ariaLabel')} className={styles.aside}>
      <Box className={styles.properties}>
        <Text className={styles.heading}>{t('issueProperties.heading')}</Text>

        <PropertyRow
          label={t('field.status')}
          icon={
            <IssueStatusIcon
              status={
                workflowStatuses.find((status) => status.id === issue.workflowStatus)?.category ??
                issue.status
              }
            />
          }
        >
          <PropertySelect
            compactChars={12}
            compactLabel={statusLabel}
            aria-label={t('field.status')}
            value={issue.workflowStatus ?? issue.status}
            onChange={handlers.Status_onChange5}
            data={workflowStatuses.map((status) => ({
              value: status.id,
              label: workflowStatusLabel(status.id, workflowStatuses),
            }))}
            renderOption={({ option }) => {
              const status = workflowStatuses.find((item) => item.id === option.value);
              return (
                <Group gap="xs" wrap="nowrap">
                  {status ? <IssueStatusIcon status={status.category} /> : null}
                  <span>{option.label}</span>
                </Group>
              );
            }}
          />
        </PropertyRow>

        <PropertyRow
          label={t('field.priority')}
          icon={<IssuePriorityIcon priority={issue.priority} />}
        >
          <PropertySelect
            compactChars={12}
            compactLabel={priorityValueLabel}
            aria-label={t('field.priority')}
            value={String(issue.priority)}
            onChange={handlers.Priority_onChange6}
            data={[0, 1, 2, 3, 4].map((priority) => ({
              value: String(priority),
              label: priorityLabel(priority),
            }))}
            renderOption={({ option }) => (
              <Group gap="xs" wrap="nowrap">
                <IssuePriorityIcon priority={Number(option.value)} />
                <span>{option.value === '0' ? priorityLabel(0) : option.label}</span>
              </Group>
            )}
          />
        </PropertyRow>

        <PropertyRow label={t('field.assignee')} icon={<IconUser size={14} stroke={1.7} />}>
          <PropertySelect
            compactChars={10}
            compactLabel={assigneeValueLabel}
            aria-label={t('field.assignee')}
            value={issue.assignee ?? 'none'}
            onChange={handlers.Assignee_onChange}
            data={[
              { value: 'none', label: t('issueAssignment.unassigned') },
              { value: 'self', label: t('issueAssignment.you') },
              { value: 'agent', label: t('issueAssignment.agent') },
            ]}
          />
        </PropertyRow>

        <PropertyRow label={t('field.project')} icon={<IconFolder size={14} stroke={1.7} />}>
          <PropertySelect
            compactChars={14}
            compactLabel={projectValueLabel}
            aria-label={t('field.project')}
            value={issue.projectId != null ? String(issue.projectId) : 'none'}
            onChange={handlers.Project_onChange7}
            data={[
              { value: 'none', label: t('field.project') },
              ...projects.map((project) => ({ value: String(project.id), label: project.name })),
            ]}
            renderOption={({ option }) => (
              <span>{option.value === 'none' ? t('issueProperties.noProject') : option.label}</span>
            )}
            searchable
            nothingFoundMessage={t('issueProperties.noProjectsFound')}
          />
        </PropertyRow>

        <PropertyRow label={t('field.estimate')} icon={<IconChartBar size={14} stroke={1.7} />}>
          <PropertySelect
            compactChars={12}
            compactLabel={estimateValueLabel}
            aria-label={t('field.estimate')}
            value={issue.estimate == null ? 'none' : String(issue.estimate)}
            onChange={handlers.Estimate_onChange15}
            data={[
              { value: 'none', label: t('issueProperties.noEstimate') },
              ...Array.from(new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, issue.estimate]))
                .filter((estimate): estimate is number => estimate != null)
                .map((estimate) => ({ value: String(estimate), label: String(estimate) })),
            ]}
            renderOption={({ option }) => (
              <span>
                {option.value === 'none' ? t('issueProperties.noEstimate') : option.label}
              </span>
            )}
          />
        </PropertyRow>

        <Box role="group" aria-label={t('issueProperties.labels')}>
          <PropertyRow
            label={t('issueProperties.labels')}
            icon={<IconTag size={14} stroke={1.7} />}
          >
            <Group gap={5} wrap="wrap" className={styles.labels}>
              {selectedLabels.map((label) => (
                <UnstyledButton
                  key={label.id}
                  type="button"
                  aria-label={t('issueProperties.removeLabel', { name: label.name })}
                  onClick={() => handlers.onClick11(true, label)}
                  className={styles.labelPill}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${label.color} 18%, transparent)`,
                  }}
                >
                  <span className={styles.labelName}>{label.name}</span>
                  <IconX size={12} stroke={1.8} aria-hidden="true" />
                </UnstyledButton>
              ))}

              <Popover position="bottom-end" shadow="md" width={264} withinPortal>
                <Popover.Target>
                  <ActionIcon
                    aria-label={t('issueProperties.addLabels')}
                    variant="subtle"
                    color="gray"
                    size="sm"
                    className={styles.addLabelButton}
                  >
                    <IconPlus size={14} stroke={1.8} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown className={styles.labelPicker}>
                  <TextInput
                    aria-label={t('issueProperties.newLabel')}
                    placeholder={t('issueProperties.findOrCreateLabel')}
                    value={labelName}
                    onChange={handlers.New_label_onChange12}
                    onKeyDown={handlers.New_label_onKeyDown13}
                    size="xs"
                    mb="xs"
                  />
                  <ScrollArea.Autosize mah={196} type="auto">
                    <Stack gap={2}>
                      {labels.map((label) => {
                        const selected = selectedLabelIds.has(label.id);
                        return (
                          <UnstyledButton
                            key={label.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => handlers.onClick11(selected, label)}
                            className={styles.labelOption}
                          >
                            <Group gap="xs" wrap="nowrap">
                              <Box
                                w={8}
                                h={8}
                                style={{
                                  flex: '0 0 auto',
                                  borderRadius: '50%',
                                  backgroundColor: label.color,
                                }}
                              />
                              <Text size="xs" truncate>
                                {label.name}
                              </Text>
                              {selected ? <IconCheck size={14} className={styles.check} /> : null}
                            </Group>
                          </UnstyledButton>
                        );
                      })}
                    </Stack>
                  </ScrollArea.Autosize>
                  {labelName.trim() ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="compact-xs"
                      fullWidth
                      mt="xs"
                      onClick={handlers.New_label_onClick23}
                    >
                      {t('issueProperties.createLabel', { name: labelName.trim() })}
                    </Button>
                  ) : null}
                </Popover.Dropdown>
              </Popover>
            </Group>
          </PropertyRow>
        </Box>

        <PropertyRow label={t('field.cycle')} icon={<IconRefresh size={14} stroke={1.7} />}>
          <PropertySelect
            compactChars={12}
            compactLabel={cycleValueLabel}
            aria-label={t('field.cycle')}
            value={issue.cycleId != null ? String(issue.cycleId) : 'none'}
            onChange={handlers.Cycle_onChange8}
            data={[
              { value: 'none', label: t('field.noCycle') },
              ...cycles.map((cycle) => ({
                value: String(cycle.id),
                label: t('field.cycleN', { number: cycle.number }),
              })),
            ]}
            renderOption={({ option }) => (
              <span>{option.value === 'none' ? t('field.noCycle') : option.label}</span>
            )}
            searchable
            nothingFoundMessage={t('issueProperties.noCyclesFound')}
          />
        </PropertyRow>

        {optionalIssuePropertyVisibility.type ? (
          <PropertyRow label={t('field.type')} icon={<IconTag size={14} stroke={1.7} />}>
            <PropertySelect
              compactChars={12}
              compactLabel={issue.type ? t(`issueType.${issue.type}`) : t('issueProperties.noType')}
              aria-label={t('field.type')}
              value={issue.type ?? 'none'}
              onChange={handlers.Type_onChange14}
              data={[
                { value: 'none', label: t('issueProperties.noType') },
                ...(['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
                  value: type,
                  label: t(`issueType.${type}`),
                })),
              ]}
            />
          </PropertyRow>
        ) : null}

        {optionalIssuePropertyVisibility.parent ? (
          <PropertyRow
            label={t('issueProperties.parent')}
            icon={<IconGitBranch size={14} stroke={1.7} />}
          >
            <PropertySelect
              compactChars={14}
              compactLabel={
                parentOptions.find((parent) => parent.id === issue.parentId)?.identifier ??
                t('issueProperties.noParent')
              }
              aria-label={t('issueProperties.parent')}
              value={issue.parentId != null ? String(issue.parentId) : 'none'}
              onChange={handlers.Parent_onChange9}
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
          </PropertyRow>
        ) : null}

        {optionalIssuePropertyVisibility.dueDate ? (
          <PropertyRow
            label={t('issueProperties.dueDate')}
            icon={<IconCalendarEvent size={14} stroke={1.7} />}
            className={styles.dueDateRow}
          >
            <TextInput
              size="sm"
              type="date"
              aria-label={t('issueProperties.dueDate')}
              value={due}
              onChange={handlers.Due_date_onChange10}
              classNames={{ input: styles.input, root: styles.dateInput }}
            />
          </PropertyRow>
        ) : null}

        {optionalIssuePropertyVisibility.milestone ? (
          <PropertyRow label={t('field.milestone')} icon={<IconFlag size={14} stroke={1.7} />}>
            <PropertySelect
              compactChars={14}
              compactLabel={
                milestones.find((milestone) => milestone.id === issue.milestoneId)?.name ??
                t('issueProperties.noMilestone')
              }
              aria-label={t('field.milestone')}
              value={issue.milestoneId != null ? String(issue.milestoneId) : 'none'}
              onChange={handlers.Milestone_onChange43}
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
          </PropertyRow>
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
              const visible = optionalIssuePropertyVisibility[key];
              return (
                <Menu.Item
                  key={key}
                  aria-pressed={visible}
                  disabled={disabled}
                  rightSection={visible ? <IconCheck size={14} aria-hidden="true" /> : null}
                  onClick={() => handlers.onToggleIssueOptionalProperty(key)}
                >
                  {label}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Box>
  );
}

function PropertyRow({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      <div className={styles.label}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <Text component="span" size="sm" c="dimmed" truncate className={styles.labelText}>
          {label}
        </Text>
      </div>
      <div className={styles.value}>{children}</div>
    </div>
  );
}

function PropertySelect({
  compactChars = 10,
  compactLabel,
  ...props
}: SelectProps<string> & { compactChars?: number; compactLabel?: string }) {
  const labelWidth = Array.from(compactLabel ?? props.value ?? '').reduce(
    (width, character) => width + ((character.codePointAt(0) ?? 0) <= 0xff ? 1 : 2),
    0,
  );
  const inputWidth = Math.max(4, Math.min(compactChars, labelWidth + 1));
  return (
    <Select
      {...props}
      size="sm"
      className={styles.select}
      classNames={{ input: styles.input, option: styles.option, dropdown: styles.dropdown }}
      styles={{ input: { width: `${inputWidth}ch` } }}
      rightSection={null}
      withCheckIcon={false}
    />
  );
}
