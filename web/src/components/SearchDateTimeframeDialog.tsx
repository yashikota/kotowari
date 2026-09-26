import { Button, Group, Modal, SimpleGrid, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
  parseCustomDateTimeframe,
  type SearchDateField,
  type SearchDateGranularity,
  type SearchDateRange,
} from '../search.ts';

const GRANULARITIES: SearchDateGranularity[] = ['day', 'month', 'quarter', 'halfYear', 'year'];

export function SearchDateTimeframeDialog({
  field,
  opened,
  title,
  value,
  granularity,
  onValueChange,
  onGranularityChange,
  onCancel,
  onApply,
}: {
  field: SearchDateField | null;
  opened?: boolean;
  title?: string;
  value: string;
  granularity: SearchDateGranularity;
  onValueChange: (value: string) => void;
  onGranularityChange: (value: SearchDateGranularity) => void;
  onCancel: () => void;
  onApply: (range: SearchDateRange) => void;
}) {
  const { t } = useTranslation();
  const range = parseCustomDateTimeframe(value);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, index) => currentYear - 4 + index);

  function choosePeriod(period: string) {
    onValueChange(period);
  }

  return (
    <Modal
      opened={opened ?? field !== null}
      onClose={onCancel}
      title={title ?? (field ? t(`searchPage.filters.${field}Date`) : undefined)}
      centered
      size="lg"
      aria-label={t('searchPage.filters.timeframeDialog')}
    >
      <Stack gap="md">
        <TextInput
          autoFocus
          type={granularity === 'day' ? 'date' : granularity === 'month' ? 'month' : 'text'}
          label={t('searchPage.filters.timeframeInput')}
          placeholder={t('searchPage.filters.timeframePlaceholder')}
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
        />
        <Tabs
          value={granularity}
          onChange={(next) => {
            if (next && GRANULARITIES.includes(next as SearchDateGranularity)) {
              onGranularityChange(next as SearchDateGranularity);
            }
          }}
        >
          <Tabs.List grow>
            {GRANULARITIES.map((item) => (
              <Tabs.Tab key={item} value={item}>
                {t(`searchPage.filters.granularities.${item}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="day" pt="sm">
            <Text size="xs" c="dimmed">
              {t('searchPage.filters.dayHint')}
            </Text>
          </Tabs.Panel>
          <Tabs.Panel value="month" pt="sm">
            <Text size="xs" c="dimmed">
              {t('searchPage.filters.monthHint')}
            </Text>
          </Tabs.Panel>
          <Tabs.Panel value="quarter" pt="sm">
            <Stack gap="xs">
              {years.map((year) => (
                <Group key={year} justify="space-between" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={38}>
                    {year}
                  </Text>
                  <SimpleGrid cols={4} spacing="xs" style={{ flex: 1 }}>
                    {[1, 2, 3, 4].map((quarter) => (
                      <Button
                        key={quarter}
                        size="compact-sm"
                        variant={value === `Q${quarter} ${year}` ? 'light' : 'subtle'}
                        aria-pressed={value === `Q${quarter} ${year}`}
                        aria-label={t('searchPage.filters.chooseQuarter', { quarter, year })}
                        onClick={() => choosePeriod(`Q${quarter} ${year}`)}
                      >
                        Q{quarter}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Group>
              ))}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="halfYear" pt="sm">
            <Stack gap="xs">
              {years.map((year) => (
                <Group key={year} justify="space-between" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={38}>
                    {year}
                  </Text>
                  <SimpleGrid cols={2} spacing="xs" style={{ flex: 1 }}>
                    {[1, 2].map((half) => (
                      <Button
                        key={half}
                        size="compact-sm"
                        variant={value === `H${half} ${year}` ? 'light' : 'subtle'}
                        aria-pressed={value === `H${half} ${year}`}
                        aria-label={t('searchPage.filters.chooseHalfYear', { half, year })}
                        onClick={() => choosePeriod(`H${half} ${year}`)}
                      >
                        {t(`searchPage.filters.halfValues.${half}`)}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Group>
              ))}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="year" pt="sm">
            <SimpleGrid cols={3} spacing="xs">
              {years.map((year) => (
                <Button
                  key={year}
                  size="compact-sm"
                  variant={value === String(year) ? 'light' : 'subtle'}
                  aria-pressed={value === String(year)}
                  onClick={() => choosePeriod(String(year))}
                >
                  {year}
                </Button>
              ))}
            </SimpleGrid>
          </Tabs.Panel>
        </Tabs>
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            {t('searchPage.filters.cancel')}
          </Button>
          <Button disabled={!range} onClick={() => range && onApply(range)}>
            {t('searchPage.filters.apply')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
