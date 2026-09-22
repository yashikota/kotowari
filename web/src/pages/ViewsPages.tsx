import { useTranslation } from 'react-i18next';
import { Box, Button, Grid, Group, NativeSelect, Stack, TextInput } from '@mantine/core';

import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { ISSUE_STATUSES } from '../types.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { EmptyState, LabelChip, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { useViewPagePresenter } from '../presenters/ViewsPages.tsx';

export function ViewPageView({ model }: { model: ReturnType<typeof useViewPagePresenter> }) {
  useTranslation();

  switch (model._view) {
    case 0: {
      const { data, issues, view, selected, handlers } = model;
      const autofocusName = useAutofocusTarget('name');
      const viewNameRef = useFocusWhen<HTMLInputElement>(autofocusName, [view.slug]);
      return (
        <Box className={view.display === 'board' ? undefined : 'linear-full-page'} h="100%">
          <SplitLayout single={view.display === 'board'}>
            <Pane single={view.display === 'board'}>
              <PageHeader
                title={view.name}
                actions={
                  <Button type="button" variant="subtle" color="red" onClick={handlers.onClick0}>
                    Delete
                  </Button>
                }
              />
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <TextInput
                      ref={viewNameRef}
                      aria-label="View name"
                      value={view.name}
                      onChange={handlers.View_name_onChange1}
                      onBlur={handlers.View_name_onBlur2}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <NativeSelect
                      aria-label="View display"
                      value={view.display}
                      onChange={handlers.View_display_onChange3}
                      data={[
                        { value: 'list', label: 'List' },
                        { value: 'board', label: 'Board' },
                      ]}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <NativeSelect
                      aria-label="View status"
                      value={view.status ?? ''}
                      onChange={handlers.View_status_onChange4}
                      data={[
                        { value: '', label: 'Any status' },
                        ...ISSUE_STATUSES.map((s) => ({ value: s, label: issueStatusLabel(s) })),
                      ]}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <NativeSelect
                      aria-label="View project"
                      value={view.project ?? ''}
                      onChange={handlers.View_project_onChange5}
                      data={[
                        { value: '', label: 'Any project' },
                        ...data.projects.map((p) => ({ value: p.slug, label: p.name })),
                      ]}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <NativeSelect
                      aria-label="View cycle"
                      value={view.cycle ?? ''}
                      onChange={handlers.View_cycle_onChange6}
                      data={[
                        { value: '', label: 'Any cycle' },
                        ...data.cycles.map((c) => ({
                          value: String(c.number),
                          label: `Cycle ${c.number}`,
                        })),
                      ]}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <NativeSelect
                      aria-label="View priority"
                      value={view.priority ?? ''}
                      onChange={handlers.View_priority_onChange7}
                      data={[
                        { value: '', label: 'Any priority' },
                        ...[0, 1, 2, 3, 4].map((i) => ({
                          value: String(i),
                          label: priorityLabel(i),
                        })),
                      ]}
                    />
                  </Grid.Col>
                </Grid>
                <Group gap="xs" role="group" aria-label="View labels">
                  {data.labels.map((l) => {
                    const on = view.labels.includes(l.name);
                    return (
                      <LabelChip
                        key={l.id}
                        name={l.name}
                        color={l.color}
                        selected={on}
                        onClick={() => handlers.onClick8(on, l)}
                      />
                    );
                  })}
                </Group>
                {view.display === 'board' ? (
                  <IssueBoard
                    issues={issues}
                    onOpen={handlers.onOpen9}
                    onMove={handlers.onMove10}
                  />
                ) : (
                  <IssueList issues={issues} selectedId={selected} onSelect={handlers.onSelect11} />
                )}
              </Stack>
            </Pane>
            {view.display === 'list' ? (
              <Pane variant="detail">
                {selected ? (
                  <IssueDetail identifier={selected} />
                ) : (
                  <EmptyState>Select an issue</EmptyState>
                )}
              </Pane>
            ) : null}
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function ViewPage() {
  return (
    <PresenterScope name="ViewPage">
      <ViewPageBinding />
    </PresenterScope>
  );
}

function ViewPageBinding() {
  const model = useViewPagePresenter();
  const handlers = useActions(model.handlers);
  return <ViewPageView model={{ ...model, handlers } as typeof model} />;
}
