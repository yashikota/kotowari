import { Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';
import type { CycleProgressPoint } from '../cycle-progress.ts';

const width = 320;
const height = 164;
const plot = { left: 8, top: 8, width: 304, height: 112 };

function xAt(at: number, start: number, end: number) {
  return plot.left + ((at - start) / (end - start)) * plot.width;
}

function yAt(value: number, max: number) {
  return plot.top + plot.height - (value / max) * plot.height;
}

function stepPath(
  points: CycleProgressPoint[],
  key: 'scope' | 'started' | 'completed',
  start: number,
  end: number,
  max: number,
) {
  if (points.length === 0) return '';
  let path = `M ${xAt(Date.parse(points[0]!.at), start, end)} ${yAt(points[0]![key], max)}`;
  for (const point of points.slice(1)) {
    path += ` H ${xAt(Date.parse(point.at), start, end)} V ${yAt(point[key], max)}`;
  }
  return path;
}

export function CycleProgressChart({
  cycle,
  points,
  locale,
}: {
  cycle: Cycle;
  points: CycleProgressPoint[];
  locale: string;
}) {
  const { t } = useTranslation();
  const start = Date.parse(cycle.startsAt);
  const end = Date.parse(cycle.endsAt);
  if (points.length === 0 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  const max = Math.max(1, ...points.map((point) => point.scope));
  const asOf = Math.min(end, Math.max(start, Date.now()));
  const futureX = xAt(asOf, start, end);
  const idealPath = `M ${plot.left} ${yAt(0, max)} L ${plot.left + plot.width} ${yAt(max, max)}`;
  const dateFormat = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const progress = points.reduce(
    (current, point) => (Date.parse(point.at) <= asOf ? point : current),
    points[0]!,
  );

  return (
    <Stack component="section" aria-label={t('cycle.progressChartHeading')} gap={6}>
      <svg
        role="img"
        aria-label={t('cycle.progressChartDescription', {
          scope: progress.scope,
          started: progress.started,
          completed: progress.completed,
        })}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="cycle-progress-future"
            width="6"
            height="6"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="var(--mantine-color-default-border)"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect
          x={plot.left}
          y={plot.top}
          width={Math.max(0, futureX - plot.left)}
          height={plot.height}
          fill="var(--mantine-color-body)"
        />
        {futureX < plot.left + plot.width ? (
          <rect
            x={futureX}
            y={plot.top}
            width={plot.left + plot.width - futureX}
            height={plot.height}
            fill="url(#cycle-progress-future)"
            opacity={0.65}
          />
        ) : null}
        <line
          x1={plot.left}
          y1={plot.top + plot.height}
          x2={plot.left + plot.width}
          y2={plot.top + plot.height}
          stroke="var(--mantine-color-default-border)"
          strokeWidth="1"
        />
        <path
          d={idealPath}
          fill="none"
          stroke="var(--mantine-color-indigo-5)"
          strokeDasharray="3 4"
          strokeWidth="1.25"
          opacity="0.8"
        />
        <path
          d={stepPath(points, 'scope', start, end, max)}
          fill="none"
          stroke="var(--mantine-color-gray-6)"
          strokeWidth="1.4"
        />
        <path
          d={stepPath(points, 'started', start, end, max)}
          fill="none"
          stroke="var(--mantine-color-yellow-7)"
          strokeWidth="1.8"
        />
        <path
          d={stepPath(points, 'completed', start, end, max)}
          fill="none"
          stroke="var(--mantine-color-indigo-5)"
          strokeWidth="1.8"
        />
        <text x={plot.left} y={height - 5} fill="currentColor" fontSize="11">
          {dateFormat.format(start)}
        </text>
        <text
          x={plot.left + plot.width}
          y={height - 5}
          fill="currentColor"
          fontSize="11"
          textAnchor="end"
        >
          {dateFormat.format(end)}
        </text>
      </svg>
      <Group gap="sm" wrap="wrap" aria-hidden="true">
        <Legend label={t('cycle.scope')} color="var(--mantine-color-gray-6)" />
        <Legend label={t('cycle.started')} color="var(--mantine-color-yellow-7)" />
        <Legend label={t('cycle.completed')} color="var(--mantine-color-indigo-5)" />
        <Legend label={t('cycle.ideal')} color="var(--mantine-color-indigo-5)" dashed />
      </Group>
    </Stack>
  );
}

function Legend({
  label,
  color,
  dashed = false,
}: {
  label: string;
  color: string;
  dashed?: boolean;
}) {
  return (
    <Group gap={5} wrap="nowrap">
      <svg width="14" height="8" aria-hidden="true">
        <line
          x1="0"
          y1="4"
          x2="14"
          y2="4"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '3 2' : undefined}
        />
      </svg>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}
