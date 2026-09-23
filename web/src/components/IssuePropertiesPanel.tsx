import { Group, NativeSelect, Stack, Textarea, TextInput } from '@mantine/core';
import { ISSUE_STATUSES } from '../types.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { LabelChip, PropertyPanel, PropertyRow } from '../mantine-ui.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;

const propertyInputStyles = {
  input: {
    height: 30,
    minHeight: 30,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 'var(--mantine-font-size-sm)',
  },
};

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

  return (
    <Stack gap="lg" component="aside" aria-label="Issue properties">
      <PropertyPanel title="Properties">
        <PropertyRow label="Status">
          <NativeSelect
            aria-label="Status"
            value={issue.status}
            onChange={handlers.Status_onChange5}
            data={ISSUE_STATUSES.map((status) => ({
              value: status,
              label: issueStatusLabel(status),
            }))}
            styles={propertyInputStyles}
          />
        </PropertyRow>
        <PropertyRow label="Priority">
          <NativeSelect
            aria-label="Priority"
            value={String(issue.priority)}
            onChange={handlers.Priority_onChange6}
            data={[0, 1, 2, 3, 4].map((priority) => ({
              value: String(priority),
              label: priorityLabel(priority),
            }))}
            styles={propertyInputStyles}
          />
        </PropertyRow>
        <PropertyRow label="Project">
          <NativeSelect
            aria-label="Project"
            value={issue.projectId != null ? String(issue.projectId) : ''}
            onChange={handlers.Project_onChange7}
            data={[
              { value: '', label: 'No project' },
              ...projects.map((project) => ({ value: String(project.id), label: project.name })),
            ]}
            styles={propertyInputStyles}
          />
        </PropertyRow>
        <PropertyRow label="Cycle">
          <NativeSelect
            aria-label="Cycle"
            value={issue.cycleId != null ? String(issue.cycleId) : ''}
            onChange={handlers.Cycle_onChange8}
            data={[
              { value: '', label: 'No cycle' },
              ...cycles.map((cycle) => ({
                value: String(cycle.id),
                label: `Cycle ${cycle.number}`,
              })),
            ]}
            styles={propertyInputStyles}
          />
        </PropertyRow>
        <PropertyRow label="Parent">
          <NativeSelect
            aria-label="Parent"
            value={issue.parentId != null ? String(issue.parentId) : ''}
            onChange={handlers.Parent_onChange9}
            data={[
              { value: '', label: 'No parent' },
              ...parentOptions.map((parent) => ({
                value: String(parent.id),
                label: `${parent.identifier} ${parent.title}`,
              })),
            ]}
            styles={propertyInputStyles}
          />
        </PropertyRow>
        <PropertyRow label="Due date">
          <TextInput
            type="date"
            aria-label="Due date"
            value={due}
            onChange={handlers.Due_date_onChange10}
            styles={propertyInputStyles}
          />
        </PropertyRow>
      </PropertyPanel>

      <PropertyPanel title="Labels">
        <Group gap="xs" role="group" aria-label="Labels">
          {labels.map((label) => (
            <LabelChip
              key={label.id}
              name={label.name}
              color={label.color}
              selected={selectedLabelIds.has(label.id)}
              onClick={() => handlers.onClick11(selectedLabelIds.has(label.id), label)}
            />
          ))}
        </Group>
        <Textarea
          rows={2}
          aria-label="New label"
          placeholder="New label"
          value={labelName}
          onChange={handlers.New_label_onChange12}
          onKeyDown={handlers.New_label_onKeyDown13}
          styles={{ input: { minHeight: 30, fontSize: 'var(--mantine-font-size-sm)' } }}
        />
      </PropertyPanel>
    </Stack>
  );
}
