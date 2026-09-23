import {
  ActionIcon,
  Box,
  Button,
  Group,
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
  IconCheck,
  IconChevronDown,
  IconFolder,
  IconGitBranch,
  IconPlus,
  IconRefresh,
  IconTag,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { ISSUE_STATUSES } from '../types.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssuePropertiesPanel.module.css';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;

export function IssuePropertiesPanel({
  model,
}: {
  model: Pick<
    IssueDetailModel,
    | 'issue'
    | 'projects'
    | 'cycles'
    | 'parentOptions'
    | 'labels'
    | 'selectedLabelIds'
    | 'labelName'
    | 'due'
    | 'handlers'
  >;
}) {
  const {
    issue,
    projects,
    cycles,
    parentOptions,
    labels,
    selectedLabelIds,
    labelName,
    due,
    handlers,
  } = model;
  const selectedLabels = labels.filter((label) => selectedLabelIds.has(label.id));

  return (
    <Box component="aside" aria-label="Issue properties" className={styles.aside}>
      <Stack component="section" aria-label="Properties" gap={5}>
        <Text className={styles.heading}>Properties</Text>

        <PropertyRow label="Status" icon={<IssueStatusIcon status={issue.status} />}>
          <PropertySelect
            aria-label="Status"
            value={issue.status}
            onChange={handlers.Status_onChange5}
            data={ISSUE_STATUSES.map((status) => ({
              value: status,
              label: issueStatusLabel(status),
            }))}
            renderOption={({ option }) => {
              const status = ISSUE_STATUSES.find((item) => item === option.value);
              return (
                <Group gap="xs" wrap="nowrap">
                  {status ? <IssueStatusIcon status={status} /> : null}
                  <span>{option.label}</span>
                </Group>
              );
            }}
          />
        </PropertyRow>

        <PropertyRow label="Priority" icon={<IssuePriorityIcon priority={issue.priority} />}>
          <PropertySelect
            aria-label="Priority"
            value={String(issue.priority)}
            onChange={handlers.Priority_onChange6}
            data={[0, 1, 2, 3, 4].map((priority) => ({
              value: String(priority),
              label: priorityLabel(priority),
            }))}
            renderOption={({ option }) => (
              <Group gap="xs" wrap="nowrap">
                <IssuePriorityIcon priority={Number(option.value)} />
                <span>{option.label}</span>
              </Group>
            )}
          />
        </PropertyRow>

        <PropertyRow label="Project" icon={<IconFolder size={14} stroke={1.7} />}>
          <PropertySelect
            aria-label="Project"
            value={issue.projectId != null ? String(issue.projectId) : 'none'}
            onChange={handlers.Project_onChange7}
            data={[
              { value: 'none', label: 'No project' },
              ...projects.map((project) => ({ value: String(project.id), label: project.name })),
            ]}
            searchable
            nothingFoundMessage="No projects found"
          />
        </PropertyRow>

        <PropertyRow label="Cycle" icon={<IconRefresh size={14} stroke={1.7} />}>
          <PropertySelect
            aria-label="Cycle"
            value={issue.cycleId != null ? String(issue.cycleId) : 'none'}
            onChange={handlers.Cycle_onChange8}
            data={[
              { value: 'none', label: 'No cycle' },
              ...cycles.map((cycle) => ({
                value: String(cycle.id),
                label: `Cycle ${cycle.number}`,
              })),
            ]}
            searchable
            nothingFoundMessage="No cycles found"
          />
        </PropertyRow>

        <PropertyRow label="Parent" icon={<IconGitBranch size={14} stroke={1.7} />}>
          <PropertySelect
            aria-label="Parent"
            value={issue.parentId != null ? String(issue.parentId) : 'none'}
            onChange={handlers.Parent_onChange9}
            data={[
              { value: 'none', label: 'No parent' },
              ...parentOptions.map((parent) => ({
                value: String(parent.id),
                label: `${parent.identifier} ${parent.title}`,
              })),
            ]}
            searchable
            nothingFoundMessage="No issues found"
          />
        </PropertyRow>

        <PropertyRow label="Due date" icon={<IconCalendarEvent size={14} stroke={1.7} />}>
          <TextInput
            size="sm"
            type="date"
            aria-label="Due date"
            value={due}
            onChange={handlers.Due_date_onChange10}
            classNames={{ input: styles.input, root: styles.dateInput }}
          />
        </PropertyRow>

        <Box role="group" aria-label="Labels">
          <PropertyRow label="Labels" icon={<IconTag size={14} stroke={1.7} />}>
            <Group gap={5} wrap="wrap" className={styles.labels}>
              {selectedLabels.map((label) => (
                <UnstyledButton
                  key={label.id}
                  type="button"
                  aria-label={`Remove label ${label.name}`}
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
                    aria-label="Add labels"
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
                    aria-label="New label"
                    placeholder="Find or create a label…"
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
                      Create “{labelName.trim()}”
                    </Button>
                  ) : null}
                </Popover.Dropdown>
              </Popover>
            </Group>
          </PropertyRow>
        </Box>
      </Stack>
    </Box>
  );
}

function PropertyRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <Text component="span" size="sm" c="dimmed" truncate>
          {label}
        </Text>
      </div>
      <div className={styles.value}>{children}</div>
    </div>
  );
}

function PropertySelect(props: SelectProps<string>) {
  return (
    <Select
      {...props}
      size="sm"
      className={styles.select}
      classNames={{ input: styles.input, option: styles.option, dropdown: styles.dropdown }}
      rightSection={<IconChevronDown size={13} stroke={1.7} />}
      rightSectionPointerEvents="none"
      withCheckIcon={false}
    />
  );
}
