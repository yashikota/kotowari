import { Box, Button, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { IconCircleDashed, IconFolder } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { priorityLabel } from '../i18n/labels.ts';
import type { IssueFacetOption, IssueFacetType } from '../issue-list.ts';
import { IssuePriorityIcon } from './issue-ui.tsx';

const FACET_TYPES: IssueFacetType[] = ['labels', 'priority', 'projects'];

export function IssueListFacetPanel({
  facet,
  options,
  selectedValues,
  onFacetChange,
  onToggle,
}: {
  facet: IssueFacetType;
  options: IssueFacetOption[];
  selectedValues: string[];
  onFacetChange: (facet: IssueFacetType) => void;
  onToggle: (value: string) => void;
}) {
  const { t } = useTranslation();
  const facetLabels = {
    labels: t('issueProperties.labels'),
    priority: t('field.priority'),
    projects: t('nav.projects'),
  } satisfies Record<IssueFacetType, string>;

  function labelFor(option: IssueFacetOption): string {
    return facet === 'priority' ? priorityLabel(Number(option.value)) : option.label;
  }

  return (
    <Paper
      component="aside"
      role="complementary"
      aria-label={t('ui.issueDetails')}
      withBorder
      radius="sm"
      p="xs"
      style={{
        width: 320,
        height: '100%',
        flexShrink: 0,
        overflowY: 'auto',
        background: 'var(--mantine-color-body)',
      }}
    >
      <Stack gap="xs">
        <Select
          aria-label={t('ui.detailBy')}
          data={FACET_TYPES.map((value) => ({ value, label: facetLabels[value] }))}
          value={facet}
          onChange={(value) => {
            if (value && FACET_TYPES.includes(value as IssueFacetType))
              onFacetChange(value as IssueFacetType);
          }}
          allowDeselect={false}
          size="sm"
          comboboxProps={{ withinPortal: false }}
          styles={{ input: { height: 32, minHeight: 32 } }}
        />
        {options.length === 0 ? (
          <Text size="sm" c="dimmed" px="xs" py="sm">
            {t('ui.noFacetValues')}
          </Text>
        ) : (
          options.map((option) => {
            const label = labelFor(option);
            const pressed = selectedValues.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                variant={pressed ? 'light' : 'subtle'}
                color="gray"
                fullWidth
                aria-pressed={pressed}
                aria-label={t('ui.facetOptionCount', {
                  label,
                  countLabel: t('ui.facetCount', { count: option.count }),
                })}
                onClick={() => onToggle(option.value)}
                styles={{ root: { height: 36, paddingInline: 8 }, inner: { width: '100%' } }}
              >
                <Group justify="space-between" wrap="nowrap" w="100%" gap="xs">
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    {facet === 'priority' ? (
                      Number(option.value) === 0 ? (
                        <IconCircleDashed
                          size={14}
                          stroke={1.7}
                          color="var(--mantine-color-gray-6)"
                          aria-hidden="true"
                        />
                      ) : (
                        <IssuePriorityIcon priority={Number(option.value)} />
                      )
                    ) : facet === 'projects' ? (
                      <IconFolder
                        size={14}
                        stroke={1.7}
                        color="var(--mantine-color-dimmed)"
                        aria-hidden="true"
                      />
                    ) : (
                      <Box
                        aria-hidden="true"
                        w={9}
                        h={9}
                        style={{
                          flexShrink: 0,
                          borderRadius: 3,
                          backgroundColor: option.color || 'var(--mantine-color-gray-5)',
                        }}
                      />
                    )}
                    <Text size="sm" truncate>
                      {label}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" ff="var(--mantine-font-family-monospace)">
                    {option.count}
                  </Text>
                </Group>
              </Button>
            );
          })
        )}
      </Stack>
    </Paper>
  );
}
