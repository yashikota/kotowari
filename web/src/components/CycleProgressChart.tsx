import { Group, Stack, Text } from '@mantine/core';
import type { KeyboardEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';
import type { CycleProgressPoint } from '../cycle-progress.ts';

const width = 660;
const height = 164;
const plot = { left: 8, top: 8, width: 644, height: 144 };

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
  showLegend = true,
  activePoint = null,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
}: {
  cycle: Cycle;
  points: CycleProgressPoint[];
  locale: string;
  showLegend?: boolean;
  activePoint?: CycleProgressPoint | null;
  onPointerMove?: (ratio: number) => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: KeyboardEventHandler<SVGSVGElement>;
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
  const selectedPoint = activePoint;
  const selectedAt = selectedPoint ? Date.parse(selectedPoint.at) : null;
  const selectedX = selectedAt == null ? null : xAt(selectedAt, start, end);
  const tooltipWidth = 144;
  const tooltipHeight = 64;
  const tooltipX =
    selectedX == null
      ? null
      : Math.min(
          Math.max(plot.left, selectedX - tooltipWidth / 2),
          plot.left + plot.width - tooltipWidth,
        );
  const tooltipY =
    selectedPoint == null
      ? null
      : Math.min(
          Math.max(
            plot.top,
            yAt(
              Math.max(selectedPoint.scope, selectedPoint.started, selectedPoint.completed),
              max,
            ) -
              tooltipHeight -
              8,
          ),
          plot.top + plot.height - tooltipHeight,
        );
  const selectedDate = selectedPoint ? dateFormat.format(Date.parse(selectedPoint.at)) : '';
  const descriptionPoint = selectedPoint ?? progress;
  const progressDescription = t('cycle.progressChartDescription', {
    scope: descriptionPoint.scope,
    started: descriptionPoint.started,
    completed: descriptionPoint.completed,
  });

  return (
    <Stack component="section" aria-label={t('cycle.progressChartHeading')} gap={6}>
      <svg
        role="img"
        aria-label={progressDescription}
        aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"
        tabIndex={0}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        onPointerMove={(event) => {
          if (!onPointerMove) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const viewBoxX = ((event.clientX - bounds.left) / bounds.width) * width;
          if (viewBoxX < plot.left || viewBoxX > plot.left + plot.width) return;
          onPointerMove((viewBoxX - plot.left) / plot.width);
        }}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
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
        {selectedPoint && selectedX != null ? (
          <g pointerEvents="none">
            <line
              x1={selectedX}
              y1={plot.top}
              x2={selectedX}
              y2={plot.top + plot.height}
              stroke="var(--mantine-color-text)"
              strokeDasharray="2 3"
              strokeWidth="1"
              opacity="0.45"
            />
            <circle
              cx={selectedX}
              cy={yAt(selectedPoint.scope, max)}
              r="3"
              fill="var(--mantine-color-gray-6)"
            />
            <circle
              cx={selectedX}
              cy={yAt(selectedPoint.started, max)}
              r="3"
              fill="var(--mantine-color-yellow-7)"
            />
            <circle
              cx={selectedX}
              cy={yAt(selectedPoint.completed, max)}
              r="3"
              fill="var(--mantine-color-indigo-5)"
            />
            {tooltipX != null && tooltipY != null ? (
              <g role="tooltip" aria-label={`${selectedDate}: ${progressDescription}`}>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="5"
                  fill="var(--mantine-color-body)"
                  stroke="var(--mantine-color-default-border)"
                />
                <text
                  x={tooltipX + 9}
                  y={tooltipY + 15}
                  fill="var(--mantine-color-text)"
                  fontSize="10"
                  fontWeight="600"
                >
                  {selectedDate}
                </text>
                <text
                  x={tooltipX + 9}
                  y={tooltipY + 31}
                  fill="var(--mantine-color-text)"
                  fontSize="9"
                >
                  {t('cycle.scope')}: {selectedPoint.scope}
                </text>
                <text
                  x={tooltipX + 9}
                  y={tooltipY + 44}
                  fill="var(--mantine-color-text)"
                  fontSize="9"
                >
                  {t('cycle.started')}: {selectedPoint.started}
                </text>
                <text
                  x={tooltipX + 9}
                  y={tooltipY + 57}
                  fill="var(--mantine-color-text)"
                  fontSize="9"
                >
                  {t('cycle.completed')}: {selectedPoint.completed}
                </text>
              </g>
            ) : null}
          </g>
        ) : null}
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
      {showLegend ? (
        <Group gap="sm" wrap="wrap" aria-hidden="true">
          <Legend label={t('cycle.scope')} color="var(--mantine-color-gray-6)" />
          <Legend label={t('cycle.started')} color="var(--mantine-color-yellow-7)" />
          <Legend label={t('cycle.completed')} color="var(--mantine-color-indigo-5)" />
          <Legend label={t('cycle.ideal')} color="var(--mantine-color-indigo-5)" dashed />
        </Group>
      ) : null}
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
