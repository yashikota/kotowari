import { Button, Group, NativeSelect, Popover, Stack, Text } from '@mantine/core';
import type { IssueSearch } from '../api.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { ISSUE_STATUSES } from '../types.ts';
import type { Cycle, Label, Project } from '../types.ts';
import { LabelChip } from '../mantine-ui.tsx';
import type { FilterChip } from '../presenters/IssueFilters.tsx';

export function IssueFilterMenu({
  search,
  projects,
  cycles,
  labels,
  selectedLabels,
  opened,
  chips,
  onToggle,
  onOpenChange,
  onStatusChange,
  onProjectChange,
  onCycleChange,
  onPriorityChange,
  onToggleLabel,
  onRemoveFilter,
  onClear,
}: {
  search: IssueSearch;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  selectedLabels: string[];
  opened: boolean;
  chips: FilterChip[];
  onToggle: () => void;
  onOpenChange: (next: boolean) => void;
  onStatusChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onCycleChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onToggleLabel: (name: string) => void;
  onRemoveFilter: (key: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      <Popover
        opened={opened}
        onChange={onOpenChange}
        position="bottom-start"
        shadow="md"
        width={300}
      >
        <Popover.Target>
          <Button
            type="button"
            size="xs"
            variant={chips.length > 0 ? 'light' : 'default'}
            aria-label="Filters"
            aria-expanded={opened}
            onClick={onToggle}
          >
            Filter{chips.length > 0 ? ` · ${chips.length}` : ''}
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs">
            <NativeSelect
              aria-label="Filter status"
              label="Status"
              value={search.status ?? ''}
              onChange={(event) => onStatusChange(event.currentTarget.value)}
              data={[
                { value: '', label: 'Any status' },
                ...ISSUE_STATUSES.map((status) => ({
                  value: status,
                  label: issueStatusLabel(status),
                })),
              ]}
            />
            <NativeSelect
              aria-label="Filter project"
              label="Project"
              value={search.project ?? ''}
              onChange={(event) => onProjectChange(event.currentTarget.value)}
              data={[
                { value: '', label: 'Any project' },
                ...projects.map((project) => ({ value: project.slug, label: project.name })),
              ]}
            />
            <NativeSelect
              aria-label="Filter cycle"
              label="Cycle"
              value={search.cycle ? String(search.cycle) : ''}
              onChange={(event) => onCycleChange(event.currentTarget.value)}
              data={[
                { value: '', label: 'Any cycle' },
                ...cycles.map((cycle) => ({
                  value: String(cycle.number),
                  label: `Cycle ${cycle.number}`,
                })),
              ]}
            />
            <NativeSelect
              aria-label="Filter priority"
              label="Priority"
              value={search.priority !== undefined ? String(search.priority) : ''}
              onChange={(event) => onPriorityChange(event.currentTarget.value)}
              data={[
                { value: '', label: 'Any priority' },
                ...[0, 1, 2, 3, 4].map((priority) => ({
                  value: String(priority),
                  label: priorityLabel(priority),
                })),
              ]}
            />
            {labels.length > 0 ? (
              <Stack gap={4} role="group" aria-label="Filter labels">
                <Text size="xs" c="dimmed" fw={500}>
                  Labels
                </Text>
                <Group gap={4}>
                  {labels.map((label) => {
                    return (
                      <LabelChip
                        key={label.id}
                        name={label.name}
                        color={label.color}
                        selected={selectedLabels.includes(label.name)}
                        onClick={() => onToggleLabel(label.name)}
                      />
                    );
                  })}
                </Group>
              </Stack>
            ) : null}
            <Button
              type="button"
              variant="subtle"
              size="xs"
              disabled={chips.length === 0}
              onClick={onClear}
            >
              Clear filters
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      {chips.length > 0 ? (
        <Group role="group" aria-label="Active filters" gap={4} mt={6}>
          {chips.map((chip) => (
            <Button
              key={chip.key}
              type="button"
              size="compact-xs"
              variant="light"
              aria-label={`Remove ${chip.label} filter`}
              onClick={() => onRemoveFilter(chip.key)}
            >
              {chip.label} ×
            </Button>
          ))}
        </Group>
      ) : null}
    </>
  );
}
