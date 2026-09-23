import { Link } from '@tanstack/react-router';
import {
  Box,
  Button,
  Group,
  NativeSelect,
  Progress,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';

import { IssueList } from '../components/IssueList.tsx';
import { CYCLE_STATUSES, PROJECT_STATUSES } from '../types.ts';
import { EmptyState, MetaBadge, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import {
  useCycleDetailPagePresenter,
  useCyclesPagePresenter,
  useProjectDetailPagePresenter,
  useProjectsPagePresenter,
} from '../presenters/ProjectsCycles.tsx';

function projectStatusLabel(status: string): string {
  return status.replace(/^./, (letter) => letter.toUpperCase());
}

function cycleStatusLabel(status: string): string {
  if (status === 'active') return 'Current';
  return projectStatusLabel(status);
}

export function ProjectsPageView({
  model,
}: {
  model: ReturnType<typeof useProjectsPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { projects, name, handlers } = model;
      const projectNameRef = useFocusWhen<HTMLInputElement>(true);
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title="Projects"
              actions={
                <Box
                  component="form"
                  onSubmit={handlers.onSubmit0}
                  className="linear-project-create"
                >
                  <TextInput
                    ref={projectNameRef}
                    aria-label="New project name"
                    placeholder="Project name"
                    value={name}
                    onChange={handlers.New_project_name_onChange1}
                  />
                  <Button type="submit" variant="default">
                    New project
                  </Button>
                </Box>
              }
            />
            {projects.length === 0 ? (
              <EmptyState>No projects yet. Name one above.</EmptyState>
            ) : (
              <Stack gap={0}>
                {projects.map((p) => (
                  <Link
                    key={p.slug}
                    to="/projects/$slug"
                    params={{ slug: p.slug }}
                    className="linear-project-link"
                  >
                    <Group wrap="nowrap" gap="sm" className="linear-project-row">
                      <Box
                        className={`linear-project-status linear-project-status-${p.status}`}
                        aria-hidden
                      />
                      <Text className="linear-project-name" flex={1} truncate>
                        {p.name}
                      </Text>
                      <MetaBadge>{projectStatusLabel(p.status)}</MetaBadge>
                      <Progress
                        aria-label={`Project progress ${Math.round(p.progress * 100)}%`}
                        value={Math.round(p.progress * 100)}
                        w={112}
                        size="sm"
                      />
                      <Text size="xs" c="dimmed" className="linear-project-target">
                        {p.targetDate ? p.targetDate.slice(0, 10) : 'No target date'}
                      </Text>
                    </Group>
                  </Link>
                ))}
              </Stack>
            )}
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function ProjectsPage() {
  return (
    <PresenterScope name="ProjectsPage">
      <ProjectsPageBinding />
    </PresenterScope>
  );
}

function ProjectsPageBinding() {
  const model = useProjectsPagePresenter();
  const handlers = useActions(model.handlers);
  return <ProjectsPageView model={{ ...model, handlers } as typeof model} />;
}

export function ProjectDetailPageView({
  model,
}: {
  model: ReturnType<typeof useProjectDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { slug, data, selected, project, handlers } = model;
      const autofocusDescription = useAutofocusTarget('description');
      const descriptionRef = useFocusWhen<HTMLTextAreaElement>(autofocusDescription, [slug]);
      return (
        <Box className="linear-full-page linear-project-detail" h="100%">
          <SplitLayout single>
            <Pane single>
              <PageHeader
                title={project.name}
                actions={
                  <Group gap="xs" wrap="wrap">
                    <NativeSelect
                      aria-label="Project status"
                      value={project.status}
                      onChange={handlers.Project_status_onChange0}
                      data={PROJECT_STATUSES.map((s) => ({
                        value: s,
                        label: projectStatusLabel(s),
                      }))}
                    />
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      New issue
                    </Button>
                    <Button type="button" variant="subtle" color="red" onClick={handlers.onClick2}>
                      Delete
                    </Button>
                  </Group>
                }
              />
              <Stack gap="md" className="linear-project-content">
                <Textarea
                  ref={descriptionRef}
                  aria-label="Project description"
                  placeholder="Description"
                  value={project.description}
                  onChange={handlers.Project_description_onChange3}
                  onBlur={handlers.Project_description_onBlur4}
                />
                <Group gap="md" wrap="wrap" align="flex-end">
                  <TextInput
                    type="date"
                    aria-label="Start date"
                    label="Start"
                    value={project.startDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Start_date_onChange5}
                  />
                  <TextInput
                    type="date"
                    aria-label="Target date"
                    label="Target"
                    value={project.targetDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Target_date_onChange6}
                  />
                </Group>
                <Stack gap="md" aria-label="Project documents" className="linear-project-documents">
                  <Stack gap="xs" className="linear-project-doc-section">
                    <Title order={4}>ADRs</Title>
                    <Button type="button" variant="subtle" size="xs" onClick={handlers.onClick7}>
                      New ADR
                    </Button>
                    <Stack
                      gap={4}
                      component="ul"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {data.adrs
                        .filter(
                          (a) =>
                            a.projectSlug === slug ||
                            data.issues.some((i) => a.issueNumbers.includes(i.number)),
                        )
                        .map((a) => (
                          <Group component="li" key={a.identifier} gap="xs" wrap="wrap">
                            <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                              {a.identifier} {a.title}
                            </Link>
                            <MetaBadge>{a.status}</MetaBadge>
                          </Group>
                        ))}
                    </Stack>
                  </Stack>
                  <Stack gap="xs" className="linear-project-doc-section">
                    <Title order={4}>Pages</Title>
                    <Stack
                      gap={4}
                      component="ul"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {data.pages
                        .filter((p) => p.projectSlug === slug)
                        .map((p) => (
                          <Text component="li" key={p.slug} size="sm">
                            <Link to="/pages/$slug" params={{ slug: p.slug }}>
                              {p.title}
                            </Link>
                          </Text>
                        ))}
                    </Stack>
                  </Stack>
                </Stack>
                <IssueList
                  issues={data.issues}
                  selectedId={selected}
                  onSelect={handlers.onSelect8}
                  groupBy="status"
                />
              </Stack>
            </Pane>
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function ProjectDetailPage() {
  return (
    <PresenterScope name="ProjectDetailPage">
      <ProjectDetailPageBinding />
    </PresenterScope>
  );
}

function ProjectDetailPageBinding() {
  const model = useProjectDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <ProjectDetailPageView model={{ ...model, handlers } as typeof model} />;
}

export function CyclesPageView({ model }: { model: ReturnType<typeof useCyclesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { cycles, handlers } = model;
      const sections = [
        ['Upcoming', cycles.filter((cycle) => cycle.status === 'upcoming')],
        ['Current', cycles.filter((cycle) => cycle.status === 'active')],
        ['Completed', cycles.filter((cycle) => cycle.status === 'completed')],
      ]
        .map(([name, rows]) => ({ name: name as string, rows: rows as typeof cycles }))
        .filter((section) => section.rows.length > 0);
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title="Cycles"
              actions={
                <Button type="button" variant="subtle" onClick={handlers.onClick0}>
                  New cycle
                </Button>
              }
            />
            {cycles.length === 0 ? (
              <EmptyState>No cycles yet. Start one to timebox work.</EmptyState>
            ) : (
              <Stack gap="lg" className="linear-cycle-list">
                {sections.map((section) => (
                  <Stack gap={0} key={section.name} className="linear-cycle-section">
                    <Group className="linear-cycle-section-heading" justify="space-between">
                      <Text>{section.name}</Text>
                      <Text c="dimmed" size="xs">
                        {section.rows.length}
                      </Text>
                    </Group>
                    {section.rows.map((cycle) => {
                      const start = new Date(cycle.startsAt);
                      const progress = cycle.issueCount
                        ? Math.round((cycle.completedCount / cycle.issueCount) * 100)
                        : 0;
                      return (
                        <Link
                          key={cycle.number}
                          to="/cycles/$number"
                          params={{ number: String(cycle.number) }}
                          className="linear-cycle-card"
                        >
                          <Box className="linear-cycle-date">
                            <Text>{start.toLocaleString('en-US', { month: 'short' })}</Text>
                            <Text>{start.getDate()}</Text>
                          </Box>
                          <Box className="linear-cycle-card-main">
                            <Group gap="sm" wrap="nowrap">
                              <Text fw={550}>Cycle {cycle.number}</Text>
                              <MetaBadge>{cycleStatusLabel(cycle.status)}</MetaBadge>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {cycle.startsAt.slice(0, 10)} — {cycle.endsAt.slice(0, 10)}
                            </Text>
                          </Box>
                          <Box className="linear-cycle-card-stats">
                            <Text size="xs" c="dimmed">
                              {cycle.issueCount} in scope
                            </Text>
                            <Progress
                              aria-label={`Cycle ${cycle.number} completion ${progress}%`}
                              value={progress}
                              size="xs"
                              w={96}
                            />
                            <Text size="xs" c="dimmed">
                              {cycle.completedCount}/{cycle.issueCount}
                            </Text>
                          </Box>
                        </Link>
                      );
                    })}
                  </Stack>
                ))}
              </Stack>
            )}
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function CyclesPage() {
  return (
    <PresenterScope name="CyclesPage">
      <CyclesPageBinding />
    </PresenterScope>
  );
}

function CyclesPageBinding() {
  const model = useCyclesPagePresenter();
  const handlers = useActions(model.handlers);
  return <CyclesPageView model={{ ...model, handlers } as typeof model} />;
}

export function CycleDetailPageView({
  model,
}: {
  model: ReturnType<typeof useCycleDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { data, selected, cycle, done, handlers } = model;
      return (
        <Box className="linear-full-page linear-cycle-detail" h="100%">
          <SplitLayout single>
            <Pane single>
              <PageHeader
                title={`Cycle ${cycle.number}`}
                actions={
                  <Group gap="xs" wrap="wrap">
                    <NativeSelect
                      aria-label="Cycle status"
                      value={cycle.status}
                      onChange={handlers.Cycle_status_onChange0}
                      data={CYCLE_STATUSES.map((s) => ({ value: s, label: cycleStatusLabel(s) }))}
                    />
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      New issue
                    </Button>
                  </Group>
                }
              />
              <Group className="linear-cycle-summary" gap="xl" wrap="wrap">
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    Dates
                  </Text>
                  <Text size="sm">
                    {cycle.startsAt.slice(0, 10)} — {cycle.endsAt.slice(0, 10)}
                  </Text>
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    Scope
                  </Text>
                  <Text size="sm">{data.issues.length} issues</Text>
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    Completed
                  </Text>
                  <Text size="sm">
                    {done} / {data.issues.length}
                  </Text>
                </Group>
                <Progress
                  aria-label="Cycle completion"
                  value={data.issues.length ? (done / data.issues.length) * 100 : 0}
                  w={132}
                  size="sm"
                />
              </Group>
              <Stack gap="sm" className="linear-cycle-issue-list">
                <IssueList
                  issues={data.issues}
                  selectedId={selected}
                  onSelect={handlers.onSelect2}
                  groupBy="status"
                />
              </Stack>
            </Pane>
          </SplitLayout>
        </Box>
      );
    }
  }
}

export function CycleDetailPage() {
  return (
    <PresenterScope name="CycleDetailPage">
      <CycleDetailPageBinding />
    </PresenterScope>
  );
}

function CycleDetailPageBinding() {
  const model = useCycleDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <CycleDetailPageView model={{ ...model, handlers } as typeof model} />;
}
