import { Box, Button, Group, Progress, Select, Stack, Text } from '@mantine/core';
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
  const { t } = useTranslation();
  const categoryLabel = t(`cycle.breakdown.${by}`);
  const total = items.reduce((count, item) => count + item.count, 0);
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
        <>
          <Progress.Root
            role="img"
            aria-label={t('cycle.breakdownDistribution', { category: categoryLabel })}
            size={8}
            radius="xl"
          >
            {items.map((item, index) => (
              <Progress.Section key={item.key} value={item.share} color={itemColor(item, index)} />
            ))}
          </Progress.Root>
          <Stack gap={2}>
            {items.map((item, index) => {
              const color = itemColor(item, index);
              const active = activeKey === item.key;
              const label = itemLabel(item);
              return (
                <Button
                  key={item.key}
                  type="button"
                  variant={active ? 'light' : 'subtle'}
                  color="gray"
                  size="compact-sm"
                  fullWidth
                  px={5}
                  aria-label={t('cycle.filterBreakdownGroup', {
                    category: categoryLabel,
                    group: label,
                  })}
                  aria-pressed={active}
                  onClick={() => onFilterToggle(item.key)}
                >
                  <Group justify="space-between" wrap="nowrap" w="100%" gap="xs">
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
                              : `var(--mantine-color-${color.replace('.', '-')})`,
                        }}
                      />
                      <Text size="xs" truncate>
                        {label}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {t('cycle.breakdownShare', {
                          count: item.count,
                          percent: Math.round(item.share),
                          total,
                        })}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {t(active ? 'cycle.clearFilter' : 'cycle.seeIssues')}
                    </Text>
                  </Group>
                </Button>
              );
            })}
          </Stack>
        </>
      )}
    </Stack>
  );
}
