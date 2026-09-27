import { Box, Button, Group, RingProgress, Select, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { CycleProgressBreakdownBy, CycleProgressBreakdownItem } from '../cycle-progress.ts';

const assigneeColors: Record<string, string> = {
  self: 'indigo.5',
  agent: 'violet.5',
  unassigned: 'gray.5',
};

const priorityColors: Record<string, string> = {
  'priority:1': 'red.6',
  'priority:2': 'orange.5',
  'priority:3': 'yellow.5',
  'priority:4': 'blue.5',
  'priority:0': 'gray.5',
};

const projectColors = ['cyan.5', 'teal.5', 'grape.5', 'pink.5', 'lime.6', 'blue.5'];

export function CycleProgressBreakdown({
  by,
  items,
  activeKey,
  onChange,
  onFilterToggle,
}: {
  by: CycleProgressBreakdownBy;
  items: CycleProgressBreakdownItem[];
  activeKey: string | null;
  onChange: (by: CycleProgressBreakdownBy) => void;
  onFilterToggle: (key: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const categoryLabel = t(`cycle.breakdown.${by}`);
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language, {
    maximumFractionDigits: 2,
  });
  const options: { value: CycleProgressBreakdownBy; label: string }[] = [
    { value: 'assignee', label: t('cycle.breakdown.assignee') },
    { value: 'label', label: t('cycle.breakdown.label') },
    { value: 'priority', label: t('cycle.breakdown.priority') },
    { value: 'project', label: t('cycle.breakdown.project') },
  ];

  const itemLabel = (item: CycleProgressBreakdownItem) => {
    if (item.key === 'no-labels') return t('cycle.noLabels');
    if (item.key === 'no-project') return t('cycle.noProject');
    if (item.key in assigneeColors)
      return t(`issueAssignment.${item.key === 'self' ? 'you' : item.key}`);
    if (item.key.startsWith('priority:')) return t(`priority.${item.value}`);
    return item.value;
  };

  const itemColor = (item: CycleProgressBreakdownItem, index: number) => {
    if (item.key in assigneeColors) return assigneeColors[item.key];
    if (item.key in priorityColors) return priorityColors[item.key];
    if (by === 'label' && item.color) return item.color;
    return projectColors[index % projectColors.length]!;
  };

  return (
    <Stack component="section" aria-label={categoryLabel} gap={6}>
      <Group justify="space-between" align="center" gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          {categoryLabel}
        </Text>
        <Select
          aria-label={t('cycle.breakdownBy')}
          value={by}
          data={options}
          onChange={(value) => {
            if (
              value === 'assignee' ||
              value === 'label' ||
              value === 'priority' ||
              value === 'project'
            ) {
              onChange(value);
            }
          }}
          size="xs"
          w={132}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
      </Group>
      {items.length === 0 ? (
        <Text size="xs" c="dimmed">
          {by === 'label' ? t('cycle.noLabelsUsed') : t('cycle.noBreakdownData')}
        </Text>
      ) : (
        <Stack gap={2}>
          {items.map((item, index) => {
            const color = itemColor(item, index);
            const active = activeKey === item.key;
            const label = itemLabel(item);
            const estimateTotal = numberFormat.format(item.estimateTotal);
            const estimateStarted = numberFormat.format(item.estimateStarted);
            const estimateCompleted = numberFormat.format(item.estimateCompleted);
            const tooltip = (
              <Stack gap={2}>
                <Text size="xs">
                  {t('cycle.progressTooltip', { percent: item.progressPercent })}
                </Text>
                <Text size="xs">
                  {t('cycle.estimatePointsTotal', {
                    count: item.estimateTotal,
                    value: estimateTotal,
                  })}
                </Text>
                <Text size="xs">
                  {t('cycle.estimatePointsStarted', {
                    count: item.estimateStarted,
                    value: estimateStarted,
                  })}
                </Text>
                <Text size="xs">
                  {t('cycle.estimatePointsCompleted', {
                    count: item.estimateCompleted,
                    value: estimateCompleted,
                  })}
                </Text>
              </Stack>
            );
            return (
              <Group key={item.key} justify="space-between" gap="xs" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <Group gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Box
                      aria-hidden="true"
                      w={7}
                      h={7}
                      style={{
                        flex: '0 0 auto',
                        borderRadius: '50%',
                        background:
                          color.startsWith('#') || color.startsWith('rgb')
                            ? color
                            : `var(--mantine-color-${color.replace('.', '-')}, ${color})`,
                      }}
                    />
                    <Text size="xs" truncate>
                      {label}
                    </Text>
                  </Group>
                  <Button
                    type="button"
                    variant={active ? 'light' : 'subtle'}
                    color="gray"
                    size="compact-sm"
                    px={5}
                    aria-label={t('cycle.filterBreakdownGroup', {
                      category: categoryLabel,
                      group: label,
                    })}
                    aria-pressed={active}
                    onClick={() => onFilterToggle(item.key)}
                  >
                    {t(active ? 'cycle.clearFilter' : 'cycle.seeIssues')}
                  </Button>
                </Group>
                <Tooltip label={tooltip} withArrow multiline>
                  <Group
                    role="img"
                    aria-label={t('cycle.groupProgressLabel', {
                      category: categoryLabel,
                      group: label,
                      percent: item.progressPercent,
                      total: estimateTotal,
                    })}
                    tabIndex={0}
                    gap={4}
                    wrap="nowrap"
                    style={{ flex: '0 0 auto' }}
                  >
                    <RingProgress
                      size={18}
                      thickness={2}
                      rootColor="gray.3"
                      sections={[{ value: item.progressPercent, color }]}
                    />
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {t('cycle.estimateProgressOf', { percent: item.progressPercent })}
                    </Text>
                    <Text size="xs" style={{ whiteSpace: 'nowrap' }}>
                      {estimateTotal}
                    </Text>
                  </Group>
                </Tooltip>
              </Group>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
