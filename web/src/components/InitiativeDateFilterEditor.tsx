import { Badge, Button, Group, Stack } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InitiativeDateField, InitiativeDateFilters } from '../initiative-list.ts';
import type { SearchDateFilter, SearchDateGranularity, SearchDateRange } from '../search.ts';
import { SEARCH_DATE_WINDOWS } from '../search.ts';
import { SearchDateTimeframeDialog } from './SearchDateTimeframeDialog.tsx';

export function InitiativeDateFilterEditor({
  open,
  activeDateField,
  dateFilters,
  dateFieldLabels,
  onActiveDateFieldChange,
  onDateFilterChange,
  applyFilterChange,
  clearDateFilter,
}: {
  open: boolean;
  activeDateField: InitiativeDateField | null;
  dateFilters: InitiativeDateFilters;
  dateFieldLabels: Record<InitiativeDateField, string>;
  onActiveDateFieldChange: (field: InitiativeDateField | null) => void;
  onDateFilterChange: (field: InitiativeDateField, filter: SearchDateFilter | undefined) => void;
  applyFilterChange: (update: () => void) => void;
  clearDateFilter: (field: InitiativeDateField) => void;
}) {
  const { t } = useTranslation();
  const [customDateField, setCustomDateField] = useState<InitiativeDateField | null>(null);
  const [customDateInput, setCustomDateInput] = useState('');
  const [customDateGranularity, setCustomDateGranularity] =
    useState<SearchDateGranularity>('quarter');

  function applyCustomDate(range: SearchDateRange) {
    if (!customDateField) return;
    const field = customDateField;
    setCustomDateField(null);
    applyFilterChange(() =>
      onDateFilterChange(field, { operator: 'in', value: { kind: 'range', ...range } }),
    );
  }

  return (
    <>
      {open ? (
        activeDateField ? (
          <Stack gap={2}>
            <Button
              type="button"
              variant="subtle"
              color="gray"
              size="compact-sm"
              fullWidth
              justify="flex-start"
              onClick={() => applyFilterChange(() => clearDateFilter(activeDateField))}
            >
              {t('searchPage.filters.anyTime')}
            </Button>
            {SEARCH_DATE_WINDOWS.map((window) => (
              <Button
                key={window}
                type="button"
                variant="subtle"
                color="gray"
                size="compact-sm"
                fullWidth
                justify="flex-start"
                aria-pressed={
                  dateFilters[activeDateField]?.value.kind === 'relative' &&
                  dateFilters[activeDateField]?.value.window === window
                }
                onClick={() =>
                  applyFilterChange(() =>
                    onDateFilterChange(activeDateField, {
                      operator: 'after',
                      value: { kind: 'relative', window },
                    }),
                  )
                }
              >
                {t(`searchPage.filters.dateWindows.${window}`)}
              </Button>
            ))}
            <Button
              type="button"
              variant="subtle"
              color="gray"
              size="compact-sm"
              fullWidth
              justify="space-between"
              rightSection={<IconChevronRight size={14} aria-hidden="true" />}
              onClick={() => {
                setCustomDateInput('');
                setCustomDateGranularity('quarter');
                setCustomDateField(activeDateField);
              }}
            >
              {t('searchPage.filters.customTimeframe')}
            </Button>
          </Stack>
        ) : (
          <Stack gap={2}>
            {Object.keys(dateFieldLabels).map((field) => {
              const dateField = field as InitiativeDateField;
              return (
                <Button
                  key={dateField}
                  type="button"
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  fullWidth
                  justify="space-between"
                  aria-pressed={Boolean(dateFilters[dateField])}
                  onClick={() => onActiveDateFieldChange(dateField)}
                  rightSection={
                    <Group gap={6} wrap="nowrap">
                      {dateFilters[dateField] ? (
                        <Badge size="xs" variant="light">
                          1
                        </Badge>
                      ) : null}
                      <IconChevronRight size={14} aria-hidden="true" />
                    </Group>
                  }
                >
                  {dateFieldLabels[dateField]}
                </Button>
              );
            })}
          </Stack>
        )
      ) : null}
      <SearchDateTimeframeDialog
        field={null}
        opened={customDateField !== null}
        title={customDateField ? dateFieldLabels[customDateField] : undefined}
        value={customDateInput}
        granularity={customDateGranularity}
        onValueChange={setCustomDateInput}
        onGranularityChange={setCustomDateGranularity}
        onCancel={() => setCustomDateField(null)}
        onApply={applyCustomDate}
      />
    </>
  );
}
