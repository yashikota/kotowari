import {
  ActionIcon,
  Button,
  Group,
  Popover,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { IconCalendarEvent, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCalendarDate } from '../time.ts';
import {
  parseProjectDate,
  parseStoredProjectDate,
  projectDateMonthGrid,
  projectDateString,
} from '../project-date.ts';

type DatePrecision = 'day' | 'month' | 'quarter' | 'half-year' | 'year';

function initialCursor(value: string): Date {
  const storedDate = parseStoredProjectDate(value);
  if (storedDate) return storedDate;
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
}

function fullDateLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function monthLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function ProjectDateProperty({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const [opened, setOpened] = useState(false);
  const [precision, setPrecision] = useState<DatePrecision>('day');
  const [cursorDate, setCursorDate] = useState(() => initialCursor(value));
  const [input, setInput] = useState(value);
  const [invalidInput, setInvalidInput] = useState(false);
  const selectedDate = parseStoredProjectDate(value);
  const selectedDateString = selectedDate ? projectDateString(selectedDate) : '';
  const year = cursorDate.getUTCFullYear();
  const month = cursorDate.getUTCMonth();
  const yearPageStart = Math.floor(year / 10) * 10;
  const monthGrid = projectDateMonthGrid(year, month);
  const monthChoices = Array.from({ length: 12 }, (_, index) => index);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, 7 + index)),
    ),
  );

  function openPicker() {
    setInput(value);
    setInvalidInput(false);
    setPrecision('day');
    setCursorDate(initialCursor(value));
    setOpened(true);
  }

  function selectDate(dateValue: string) {
    onChange(dateValue);
    setInput(dateValue);
    setCursorDate(parseStoredProjectDate(dateValue) ?? cursorDate);
    setInvalidInput(false);
    setOpened(false);
  }

  function applyNaturalDate() {
    const parsed = parseProjectDate(input);
    if (!parsed) {
      setInvalidInput(true);
      return;
    }
    selectDate(parsed);
  }

  function moveCalendar(direction: -1 | 1) {
    if (precision === 'year') {
      setCursorDate(new Date(Date.UTC(year + direction * 10, 0, 1)));
      return;
    }
    setCursorDate(
      precision === 'day'
        ? new Date(Date.UTC(year, month + direction, 1))
        : new Date(Date.UTC(year + direction, month, 1)),
    );
  }

  function periodLabel(): string {
    if (precision === 'day') return monthLabel(cursorDate, locale);
    if (precision === 'year') return `${yearPageStart}–${yearPageStart + 9}`;
    return String(year);
  }

  function choosePeriod(monthIndex: number) {
    selectDate(projectDateString(new Date(Date.UTC(year, monthIndex, 1))));
  }

  function changePrecision(next: string | null) {
    if (
      next === 'day' ||
      next === 'month' ||
      next === 'quarter' ||
      next === 'half-year' ||
      next === 'year'
    )
      setPrecision(next);
  }

  return (
    <Popover
      opened={opened}
      onChange={(next) => {
        setOpened(next);
        if (next) openPicker();
      }}
      position="bottom-start"
      offset={4}
      shadow="md"
      withinPortal
      closeOnClickOutside
    >
      <Popover.Target>
        <Button
          type="button"
          variant="default"
          size="xs"
          leftSection={<IconCalendarEvent size={14} stroke={1.7} aria-hidden="true" />}
          aria-label={t('projectDate.change', { field: label })}
          onClick={() => (opened ? setOpened(false) : openPicker())}
          styles={{ root: { borderRadius: 999 } }}
        >
          {value ? formatCalendarDate(value, locale) : label}
        </Button>
      </Popover.Target>
      <Popover.Dropdown aria-label={t('projectDate.change', { field: label })}>
        <Stack gap="xs" w={304}>
          <TextInput
            autoFocus
            aria-label={t('projectDate.set', { field: label })}
            placeholder={t('projectDate.try')}
            value={input}
            error={invalidInput ? t('projectDate.invalid') : undefined}
            onChange={(event) => {
              setInput(event.currentTarget.value);
              setInvalidInput(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyNaturalDate();
              }
            }}
          />
          <Tabs value={precision} onChange={changePrecision} variant="default">
            <Tabs.List grow aria-label={t('projectDate.precision')} style={{ flexWrap: 'nowrap' }}>
              <Tabs.Tab value="day" style={{ paddingInline: 6, whiteSpace: 'nowrap' }}>
                {t('projectDate.day')}
              </Tabs.Tab>
              <Tabs.Tab value="month" style={{ paddingInline: 6, whiteSpace: 'nowrap' }}>
                {t('projectDate.month')}
              </Tabs.Tab>
              <Tabs.Tab value="quarter" style={{ paddingInline: 6, whiteSpace: 'nowrap' }}>
                {t('projectDate.quarterTab')}
              </Tabs.Tab>
              <Tabs.Tab value="half-year" style={{ paddingInline: 6, whiteSpace: 'nowrap' }}>
                {t('projectDate.halfYear')}
              </Tabs.Tab>
              <Tabs.Tab value="year" style={{ paddingInline: 6, whiteSpace: 'nowrap' }}>
                {t('projectDate.year')}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Group justify="space-between" align="center">
            <ActionIcon
              type="button"
              variant="subtle"
              aria-label={t('projectDate.previous', {
                period: t(`projectDate.period.${precision}`),
              })}
              onClick={() => moveCalendar(-1)}
            >
              <IconChevronLeft size={16} aria-hidden="true" />
            </ActionIcon>
            <Text size="sm" fw={600} aria-live="polite">
              {periodLabel()}
            </Text>
            <ActionIcon
              type="button"
              variant="subtle"
              aria-label={t('projectDate.next', { period: t(`projectDate.period.${precision}`) })}
              onClick={() => moveCalendar(1)}
            >
              <IconChevronRight size={16} aria-hidden="true" />
            </ActionIcon>
          </Group>
          {precision === 'day' ? (
            <SimpleGrid
              cols={7}
              spacing={4}
              role="grid"
              aria-label={monthLabel(cursorDate, locale)}
            >
              {weekDays.map((day, index) => (
                <Text key={`${day}-${index}`} size="xs" c="dimmed" ta="center" role="columnheader">
                  {day}
                </Text>
              ))}
              {monthGrid.map((date) => {
                const dateValue = projectDateString(date);
                const inCurrentMonth = date.getUTCMonth() === month;
                const selected = dateValue === selectedDateString;
                return (
                  <Button
                    key={dateValue}
                    type="button"
                    size="compact-xs"
                    variant={selected ? 'filled' : 'subtle'}
                    color={inCurrentMonth ? undefined : 'gray'}
                    aria-label={fullDateLabel(date, locale)}
                    aria-pressed={selected}
                    onClick={() => selectDate(dateValue)}
                  >
                    {date.getUTCDate()}
                  </Button>
                );
              })}
            </SimpleGrid>
          ) : null}
          {precision === 'month' ? (
            <SimpleGrid cols={3} spacing="xs">
              {monthChoices.map((monthIndex) => {
                const dateValue = projectDateString(new Date(Date.UTC(year, monthIndex, 1)));
                const monthName = new Intl.DateTimeFormat(locale, {
                  month: 'short',
                  timeZone: 'UTC',
                }).format(new Date(Date.UTC(year, monthIndex, 1)));
                return (
                  <Button
                    key={monthIndex}
                    type="button"
                    variant={dateValue === selectedDateString ? 'filled' : 'subtle'}
                    aria-pressed={dateValue === selectedDateString}
                    aria-label={t('projectDate.monthOfYear', { month: monthName, year })}
                    onClick={() => choosePeriod(monthIndex)}
                  >
                    {monthName}
                  </Button>
                );
              })}
            </SimpleGrid>
          ) : null}
          {precision === 'quarter' ? (
            <SimpleGrid cols={2} spacing="xs">
              {[0, 1, 2, 3].map((quarter) => {
                const dateValue = projectDateString(new Date(Date.UTC(year, quarter * 3, 1)));
                return (
                  <Button
                    key={quarter}
                    type="button"
                    variant={dateValue === selectedDateString ? 'filled' : 'subtle'}
                    aria-pressed={dateValue === selectedDateString}
                    onClick={() => choosePeriod(quarter * 3)}
                  >
                    {t('projectDate.quarterLabel', { number: quarter + 1 })}
                  </Button>
                );
              })}
            </SimpleGrid>
          ) : null}
          {precision === 'half-year' ? (
            <SimpleGrid cols={2} spacing="xs">
              {[0, 1].map((half) => {
                const monthIndex = half * 6;
                const dateValue = projectDateString(new Date(Date.UTC(year, monthIndex, 1)));
                return (
                  <Button
                    key={half}
                    type="button"
                    variant={dateValue === selectedDateString ? 'filled' : 'subtle'}
                    aria-pressed={dateValue === selectedDateString}
                    onClick={() => choosePeriod(monthIndex)}
                  >
                    {t(half === 0 ? 'projectDate.firstHalf' : 'projectDate.secondHalf')}
                  </Button>
                );
              })}
            </SimpleGrid>
          ) : null}
          {precision === 'year' ? (
            <SimpleGrid cols={3} spacing="xs">
              {Array.from({ length: 12 }, (_, index) => yearPageStart + index - 1).map(
                (calendarYear) => {
                  const dateValue = projectDateString(new Date(Date.UTC(calendarYear, 0, 1)));
                  return (
                    <Button
                      key={calendarYear}
                      type="button"
                      variant={dateValue === selectedDateString ? 'filled' : 'subtle'}
                      aria-pressed={dateValue === selectedDateString}
                      onClick={() => selectDate(dateValue)}
                    >
                      {calendarYear}
                    </Button>
                  );
                },
              )}
            </SimpleGrid>
          ) : null}
          <Button
            type="button"
            variant="subtle"
            size="xs"
            disabled={!value}
            onClick={() => selectDate('')}
          >
            {t('projectDate.clear')}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
