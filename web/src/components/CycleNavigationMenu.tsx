import { Button, Kbd, Menu, ScrollArea, Text, TextInput } from '@mantine/core';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';
import { formatCalendarDate } from '../time.ts';

export function CycleNavigationMenu({
  currentCycleName,
  opened,
  nextCycles,
  previousCycles,
  searchQuery,
  onOpenChange,
  onSearchChange,
  onNavigate,
}: {
  currentCycleName: string;
  opened: boolean;
  nextCycles: Cycle[];
  previousCycles: Cycle[];
  searchQuery: string;
  onOpenChange: (opened: boolean) => void;
  onSearchChange: (value: string) => void;
  onNavigate: (number: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;

  function cycleName(cycle: Cycle) {
    return cycle.name || t('field.cycleN', { number: cycle.number });
  }

  function cycleDates(cycle: Cycle) {
    return `${formatCalendarDate(cycle.startsAt, locale)} - ${formatCalendarDate(cycle.endsAt, locale)}`;
  }

  function renderCycles(cycles: Cycle[], shortcut?: string) {
    return cycles.map((cycle, index) => (
      <Menu.Item
        key={cycle.number}
        aria-label={`${cycleName(cycle)} ${cycleDates(cycle)}`}
        rightSection={index === 0 && shortcut ? <Kbd>{shortcut}</Kbd> : null}
        onClick={() => onNavigate(cycle.number)}
      >
        <Text size="sm" truncate>
          {cycleName(cycle)}
        </Text>
        <Text size="xs" c="dimmed">
          {cycleDates(cycle)}
        </Text>
      </Menu.Item>
    ));
  }

  const hasCycles = nextCycles.length > 0 || previousCycles.length > 0;

  return (
    <Menu
      opened={opened}
      onChange={onOpenChange}
      position="bottom-start"
      shadow="md"
      withinPortal
      closeOnItemClick
      withInitialFocusPlaceholder={false}
    >
      <Menu.Target>
        <Button
          type="button"
          variant="subtle"
          color="gray"
          size="compact-sm"
          rightSection={<IconChevronDown size={14} stroke={1.7} aria-hidden="true" />}
          aria-label={t('cycle.openCycle')}
          title={t('cycle.openCycle')}
          aria-expanded={opened}
        >
          {currentCycleName}
        </Button>
      </Menu.Target>
      <Menu.Dropdown aria-label={t('cycle.openCycle')} p={0} w={320}>
        <TextInput
          aria-label={t('cycle.openCycle')}
          placeholder={t('cycle.openCyclePlaceholder')}
          leftSection={<IconSearch size={15} aria-hidden="true" />}
          value={searchQuery}
          autoFocus={opened}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          styles={{ input: { border: 0, borderRadius: 0 } }}
        />
        <Menu.Divider />
        <ScrollArea.Autosize mah="min(70vh, 420px)" type="auto">
          {nextCycles.length > 0 ? (
            <>
              <Menu.Label>{t('cycle.nextCycle')}</Menu.Label>
              {renderCycles(nextCycles, t('cycle.nextShortcut'))}
            </>
          ) : null}
          {previousCycles.length > 0 ? (
            <>
              {nextCycles.length > 0 ? <Menu.Divider /> : null}
              <Menu.Label>{t('cycle.previousCycle')}</Menu.Label>
              {renderCycles(previousCycles, t('cycle.previousShortcut'))}
            </>
          ) : null}
          {!hasCycles ? (
            <Text size="sm" c="dimmed" ta="center" p="md">
              {t('cycle.noCyclesFound')}
            </Text>
          ) : null}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
