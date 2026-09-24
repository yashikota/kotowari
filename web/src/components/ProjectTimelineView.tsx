import { Badge, Box, Button, Group, Stack, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useRef } from 'react';
import type { Project } from '../types.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { formatCalendarDate } from '../time.ts';
import { priorityLabel } from '../i18n/labels.ts';

export type ProjectTimelineModel = {
  startMonth: string;
  totalDays: number;
  todayPosition: number | null;
  months: { key: string; label: string; year: string; left: number; width: number }[];
  weeks: { key: string; label: string; left: number; width: number }[];
  groups: { key: string; label: string; projects: Project[] }[];
};

const STATUS_COLORS: Record<string, string> = {
  started: 'indigo',
  completed: 'teal',
  canceled: 'red',
  planned: 'blue',
  backlog: 'gray',
};

function dateOrdinal(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function ProjectTimelineView({
  model,
  showProjectList,
  showWeekNumbers,
  focusToday,
  displayProperties,
  issueCounts,
  grouped,
  handlers,
}: {
  model: ProjectTimelineModel;
  showProjectList: boolean;
  showWeekNumbers: boolean;
  focusToday: boolean;
  displayProperties: ProjectDisplayProperty[];
  issueCounts: Record<string, number>;
  grouped: boolean;
  handlers: {
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
  };
}) {
  const { t } = useTranslation();
  const listWidth = showProjectList ? 264 : 0;
  const weekWidth = showWeekNumbers ? 34 : 18;
  const timelineWidth = model.weeks.length * weekWidth;
  const startOrdinal = dateOrdinal(`${model.startMonth}-01`);
  const scrollArea = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = scrollArea.current;
    if (!element || !focusToday || model.todayPosition === null) return;
    const timelineViewport = Math.max(0, element.clientWidth - listWidth);
    element.scrollLeft = Math.max(
      0,
      (timelineWidth * model.todayPosition) / 100 - timelineViewport / 2,
    );
  }, [focusToday, listWidth, model.startMonth, model.todayPosition, timelineWidth]);

  return (
    <Stack gap="xs" role="region" aria-label={t('projectList.projectTimeline')}>
      <Group justify="flex-end" gap="xs">
        <Button type="button" variant="subtle" size="xs" onClick={handlers.onPrevious}>
          {t('projectList.previousPeriod')}
        </Button>
        <Button type="button" variant="default" size="xs" onClick={handlers.onToday}>
          {t('projectList.today')}
        </Button>
        <Button type="button" variant="subtle" size="xs" onClick={handlers.onNext}>
          {t('projectList.nextPeriod')}
        </Button>
      </Group>
      <Box ref={scrollArea} style={{ overflowX: 'auto' }}>
        <Box style={{ minWidth: `${listWidth + timelineWidth}px` }}>
          <Box
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: `${showProjectList ? `${listWidth}px ` : ''}${timelineWidth}px`,
            }}
          >
            {showProjectList ? (
              <Group
                role="columnheader"
                px="sm"
                py="xs"
                justify="space-between"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  background: 'var(--mantine-color-body)',
                }}
              >
                <Text size="xs" fw={600} c="dimmed">
                  {t('projectList.project')}
                </Text>
                {displayProperties.includes('startDate') ||
                displayProperties.includes('targetDate') ? (
                  <Text size="xs" fw={600} c="dimmed">
                    {t('projectList.dates')}
                  </Text>
                ) : null}
              </Group>
            ) : null}
            <Box role="columnheader" aria-label={t('projectList.timeline')}>
              <Box
                h={36}
                pos="relative"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                {model.months.map((month, index) => (
                  <Box
                    key={month.key}
                    pos="absolute"
                    top={0}
                    left={`${month.left}%`}
                    w={`${month.width}%`}
                    h="100%"
                    px={6}
                    style={{
                      borderLeft: '1px solid var(--mantine-color-default-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <Text size="xs" fw={600} c="dimmed" truncate>
                      {month.label} {(index === 0 || month.key.endsWith('-01')) && month.year}
                    </Text>
                  </Box>
                ))}
              </Box>
              {showWeekNumbers ? (
                <Box h={22} pos="relative" aria-label={t('projectList.weekNumbers')}>
                  {model.weeks.map((week) => (
                    <Text
                      key={week.key}
                      size="10px"
                      c="dimmed"
                      ta="center"
                      pos="absolute"
                      left={`${week.left}%`}
                      w={`${week.width}%`}
                      style={{ overflow: 'hidden' }}
                    >
                      {week.label}
                    </Text>
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>
          <Stack gap={0}>
            {model.groups.map((group) => (
              <Box key={group.key}>
                {grouped ? (
                  <Text size="xs" fw={600} c="dimmed" mt="sm" mb={4} px={listWidth ? 'sm' : 0}>
                    {group.label}
                  </Text>
                ) : null}
                {group.projects.map((project) => {
                  const start = project.startDate ?? project.targetDate;
                  const end = project.targetDate ?? project.startDate;
                  let bar: { left: number; width: number } | null = null;
                  if (start && end) {
                    const startOffset = dateOrdinal(start) - startOrdinal;
                    const endOffset = dateOrdinal(end) - startOrdinal + 1;
                    const clippedStart = Math.max(0, startOffset);
                    const clippedEnd = Math.min(model.totalDays, endOffset);
                    if (clippedEnd > clippedStart) {
                      bar = {
                        left: (clippedStart / model.totalDays) * 100,
                        width: ((clippedEnd - clippedStart) / model.totalDays) * 100,
                      };
                    }
                  }
                  return (
                    <Box
                      key={project.slug}
                      role="row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `${showProjectList ? `${listWidth}px ` : ''}${timelineWidth}px`,
                        minHeight: 44,
                      }}
                    >
                      {showProjectList ? (
                        <ProjectTimelineProjectLabel
                          project={project}
                          displayProperties={displayProperties}
                          issueCount={issueCounts[project.slug] ?? 0}
                        />
                      ) : null}
                      <Box
                        role="gridcell"
                        aria-label={project.name}
                        pos="relative"
                        mih={44}
                        style={{
                          borderBottom: '1px solid var(--mantine-color-default-border)',
                          backgroundImage: `linear-gradient(to right, transparent calc(100% - 1px), var(--mantine-color-default-border) calc(100% - 1px))`,
                          backgroundSize: `${100 / model.weeks.length}% 100%`,
                        }}
                      >
                        {model.todayPosition !== null ? (
                          <Box
                            pos="absolute"
                            top={0}
                            bottom={0}
                            left={`${model.todayPosition}%`}
                            w={1}
                            style={{ background: 'var(--mantine-color-orange-6)', zIndex: 1 }}
                            aria-hidden
                          />
                        ) : null}
                        {bar ? (
                          <Link
                            to="/projects/$slug"
                            params={{ slug: project.slug }}
                            aria-label={t('projectList.openProject', { name: project.name })}
                            style={{
                              position: 'absolute',
                              left: `${bar.left}%`,
                              width: `${bar.width}%`,
                              top: 9,
                              minWidth: 8,
                              height: 26,
                              borderRadius: 6,
                              overflow: 'hidden',
                              textDecoration: 'none',
                              zIndex: 2,
                            }}
                          >
                            <Badge
                              fullWidth
                              h={26}
                              variant="light"
                              color={STATUS_COLORS[project.status] ?? 'gray'}
                              radius="sm"
                              style={{ justifyContent: 'flex-start', overflow: 'hidden' }}
                            >
                              <Text size="xs" truncate>
                                {showProjectList && displayProperties.includes('status')
                                  ? t(`projectStatus.${project.status}`)
                                  : project.name}
                              </Text>
                            </Badge>
                          </Link>
                        ) : null}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}

function ProjectTimelineProjectLabel({
  project,
  displayProperties,
  issueCount,
}: {
  project: Project;
  displayProperties: ProjectDisplayProperty[];
  issueCount: number;
}) {
  const { t, i18n } = useTranslation();
  const shows = (property: ProjectDisplayProperty) => displayProperties.includes(property);
  return (
    <Stack
      role="rowheader"
      gap={2}
      px="sm"
      py={4}
      style={{
        position: 'sticky',
        left: 0,
        zIndex: 2,
        background: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}
        >
          <Text size="sm" truncate>
            {project.name}
          </Text>
        </Link>
        {shows('id') ? (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            #{project.id}
          </Text>
        ) : null}
      </Group>
      {shows('summary') && project.description ? (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {project.description}
        </Text>
      ) : null}
      {shows('status') || shows('priority') || shows('health') || shows('labels') ? (
        <Group gap={4} wrap="wrap">
          {shows('status') ? (
            <Badge size="xs" variant="light" color={STATUS_COLORS[project.status] ?? 'gray'}>
              {t(`projectStatus.${project.status}`)}
            </Badge>
          ) : null}
          {shows('priority') ? (
            <Badge size="xs" variant="light" color="gray">
              {priorityLabel(project.priority)}
            </Badge>
          ) : null}
          {shows('health') ? (
            <Badge
              size="xs"
              variant="light"
              color={
                project.health === 'on_track'
                  ? 'teal'
                  : project.health === 'at_risk'
                    ? 'yellow'
                    : project.health === 'off_track'
                      ? 'red'
                      : 'gray'
              }
            >
              {t(`projectHealth.status.${project.health || 'none'}`)}
            </Badge>
          ) : null}
          {shows('labels')
            ? (project.labels ?? []).slice(0, 2).map((label) => (
                <Badge key={label} size="xs" variant="outline" color="gray">
                  {label}
                </Badge>
              ))
            : null}
        </Group>
      ) : null}
      {shows('startDate') || shows('targetDate') ? (
        <Text size="xs" c="dimmed">
          {shows('startDate') && project.startDate
            ? formatCalendarDate(project.startDate, i18n.language)
            : '—'}
          {shows('targetDate') && project.targetDate
            ? ` – ${formatCalendarDate(project.targetDate, i18n.language)}`
            : ''}
        </Text>
      ) : null}
      {shows('milestones') || shows('dependencies') || shows('issues') ? (
        <Group gap={4} wrap="wrap">
          {shows('milestones') ? (
            <Badge size="xs" variant="outline" color="gray">
              {t('projectList.milestonesCount', { count: project.milestones.length })}
            </Badge>
          ) : null}
          {shows('dependencies') ? (
            <Badge size="xs" variant="outline" color="gray">
              {t('projectList.dependenciesCount', { count: project.dependencies?.length ?? 0 })}
            </Badge>
          ) : null}
          {shows('issues') ? (
            <Badge size="xs" variant="outline" color="gray">
              {t('projectList.issuesCount', { count: issueCount })}
            </Badge>
          ) : null}
        </Group>
      ) : null}
      {shows('created') || shows('updated') ? (
        <Text size="xs" c="dimmed">
          {shows('created')
            ? t('projectList.createdDate', {
                date: formatCalendarDate(project.createdAt, i18n.language),
              })
            : null}
          {shows('created') && shows('updated') ? ' · ' : null}
          {shows('updated')
            ? t('projectList.updatedDate', {
                date: formatCalendarDate(project.updatedAt, i18n.language),
              })
            : null}
        </Text>
      ) : null}
    </Stack>
  );
}
