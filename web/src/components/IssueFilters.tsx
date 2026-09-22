import { Box, Chip, Group, NativeSelect, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ISSUE_STATUSES } from '../types.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { LabelChip } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueFiltersPresenter } from '../presenters/IssueFilters.tsx';

const filterSelectProps = {
  size: 'xs' as const,
  styles: {
    input: {
      height: 28,
      minHeight: 28,
      fontSize: 12,
      borderColor: 'var(--mantine-color-default-border)',
      backgroundColor: 'transparent',
    },
  },
};

export function IssueFiltersView({
  model,
}: {
  model: ReturnType<typeof useIssueFiltersPresenter>;
}) {
  useTranslation();

  switch (model._view) {
    case 0: {
      const { search, projects, cycles, labels, find, onFind, findRef, selectedLabels, handlers } =
        model;
      return (
        <Box
          className="linear-issue-list-toolbar"
          px="sm"
          pb="xs"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group role="search" aria-label="Issue filters" gap={6} wrap="wrap">
            <NativeSelect
              aria-label="Filter status"
              value={search.status ?? ''}
              onChange={(e) => handlers.Filter_status_onChange0(e.target.value || null)}
              data={[
                { value: '', label: 'Status' },
                ...ISSUE_STATUSES.map((s) => ({ value: s, label: issueStatusLabel(s) })),
              ]}
              w={120}
              {...filterSelectProps}
            />
            <NativeSelect
              aria-label="Filter project"
              value={search.project ?? ''}
              onChange={(e) => handlers.Filter_project_onChange1(e.target.value || null)}
              data={[
                { value: '', label: 'Project' },
                ...projects.map((p) => ({ value: p.slug, label: p.name })),
              ]}
              w={120}
              {...filterSelectProps}
            />
            <NativeSelect
              aria-label="Filter cycle"
              value={search.cycle ? String(search.cycle) : ''}
              onChange={(e) => handlers.Filter_cycle_onChange2(e.target.value || null)}
              data={[
                { value: '', label: 'Cycle' },
                ...cycles.map((c) => ({ value: String(c.number), label: 'Cycle ' + c.number })),
              ]}
              w={100}
              {...filterSelectProps}
            />
            <NativeSelect
              aria-label="Filter priority"
              value={search.priority !== undefined ? String(search.priority) : ''}
              onChange={(e) => handlers.Filter_priority_onChange3(e.target.value || null)}
              data={[
                { value: '', label: 'Priority' },
                ...[0, 1, 2, 3, 4].map((i) => ({ value: String(i), label: priorityLabel(i) })),
              ]}
              w={110}
              {...filterSelectProps}
            />
            {onFind ? (
              <TextInput
                ref={findRef}
                aria-label="Find issues"
                placeholder="Find…"
                value={find ?? ''}
                onChange={handlers.Find_issues_onChange4}
                size="xs"
                w={140}
                styles={{
                  input: {
                    height: 28,
                    minHeight: 28,
                    fontSize: 12,
                    backgroundColor: 'transparent',
                  },
                }}
              />
            ) : null}
          </Group>
          {labels.length > 0 ? (
            <Group gap={4} role="group" aria-label="Filter labels" mt={6}>
              <Chip.Group multiple>
                {labels.map((l) => {
                  const on = selectedLabels.includes(l.name);
                  return (
                    <LabelChip
                      key={l.id}
                      name={l.name}
                      color={l.color}
                      selected={on}
                      onClick={() => handlers.onClick5(on, l)}
                    />
                  );
                })}
              </Chip.Group>
            </Group>
          ) : null}
        </Box>
      );
    }
  }
}

export function IssueFilters(props: Parameters<typeof useIssueFiltersPresenter>[0]) {
  return (
    <PresenterScope name="IssueFilters">
      <IssueFiltersBinding {...props} />
    </PresenterScope>
  );
}

function IssueFiltersBinding(props: Parameters<typeof useIssueFiltersPresenter>[0]) {
  const model = useIssueFiltersPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueFiltersView model={{ ...model, handlers } as typeof model} />;
}
