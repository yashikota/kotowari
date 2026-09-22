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

import { IssueDetail } from '../components/IssueDetail.tsx';
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

export function ProjectsPageView({
  model,
}: {
  model: ReturnType<typeof useProjectsPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { projects, name, handlers } = model;
      const projectNameRef = useFocusWhen<HTMLTextAreaElement>(true);
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title="Projects"
              actions={
                <Box component="form" onSubmit={handlers.onSubmit0} style={{ minWidth: 240 }}>
                  <Textarea
                    ref={projectNameRef}
                    rows={2}
                    aria-label="New project name"
                    placeholder="New project"
                    value={name}
                    onChange={handlers.New_project_name_onChange1}
                  />
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
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <Group
                      wrap="nowrap"
                      gap="xs"
                      py={6}
                      px="md"
                      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <Box
                        w={2}
                        h={16}
                        bg="var(--mantine-color-default-border)"
                        style={{ borderRadius: 1, flexShrink: 0 }}
                      />
                      <Text ff="monospace" size="xs" c="dimmed" w={72} style={{ flexShrink: 0 }}>
                        {p.status}
                      </Text>
                      <Text flex={1} truncate>
                        {p.name}
                      </Text>
                      <Progress value={Math.round(p.progress * 100)} w={72} size="sm" />
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
        <Box className="linear-full-page" h="100%">
          <SplitLayout>
            <Pane>
              <PageHeader
                title={project.name}
                actions={
                  <Group gap="xs" wrap="wrap">
                    <NativeSelect
                      aria-label="Project status"
                      value={project.status}
                      onChange={handlers.Project_status_onChange0}
                      data={PROJECT_STATUSES.map((s) => ({ value: s, label: s }))}
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
              <Stack gap="md">
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
                <Stack gap="md" aria-label="Project documents">
                  <Stack gap="xs">
                    <Title order={4}>ADRs</Title>
                    <Button type="button" onClick={handlers.onClick7}>
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
                  <Stack gap="xs">
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
                  openOnSelect={false}
                />
              </Stack>
            </Pane>
            <Pane variant="detail">
              {selected ? (
                <IssueDetail identifier={selected} />
              ) : (
                <EmptyState>Select an issue</EmptyState>
              )}
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
              <Stack gap={0}>
                {cycles.map((c) => (
                  <Link
                    key={c.number}
                    to="/cycles/$number"
                    params={{ number: String(c.number) }}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <Group
                      wrap="nowrap"
                      gap="xs"
                      py={6}
                      px="md"
                      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <Box
                        w={2}
                        h={16}
                        bg="var(--mantine-color-default-border)"
                        style={{ borderRadius: 1, flexShrink: 0 }}
                      />
                      <Text ff="monospace" size="xs" c="dimmed" w={72} style={{ flexShrink: 0 }}>
                        {c.number}
                      </Text>
                      <Text flex={1} truncate>
                        {c.status} · {c.startsAt.slice(0, 10)} → {c.endsAt.slice(0, 10)}
                      </Text>
                      <MetaBadge>{c.status}</MetaBadge>
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
      const { data, selected, cycle, handlers } = model;
      return (
        <Box className="linear-full-page" h="100%">
          <SplitLayout>
            <Pane>
              <PageHeader
                title={`Cycle ${cycle.number}`}
                actions={
                  <Group gap="xs" wrap="wrap">
                    <NativeSelect
                      aria-label="Cycle status"
                      value={cycle.status}
                      onChange={handlers.Cycle_status_onChange0}
                      data={CYCLE_STATUSES.map((s) => ({ value: s, label: s }))}
                    />
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      New issue
                    </Button>
                  </Group>
                }
              />
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  {cycle.startsAt.slice(0, 10)} — {cycle.endsAt.slice(0, 10)}
                </Text>
                <IssueList
                  issues={data.issues}
                  selectedId={selected}
                  onSelect={handlers.onSelect2}
                  openOnSelect={false}
                />
              </Stack>
            </Pane>
            <Pane variant="detail">
              {selected ? (
                <IssueDetail identifier={selected} />
              ) : (
                <EmptyState>Select an issue</EmptyState>
              )}
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
