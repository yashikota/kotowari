const stampOpts: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

export function systemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function listTimeZones(): string[] {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    return Intl.supportedValuesOf('timeZone');
  }
  const local = systemTimeZone();
  return local === 'UTC' ? ['UTC'] : ['UTC', local];
}

export function timeZoneChoices(current?: string): string[] {
  const zones = listTimeZones();
  if (current && !zones.includes(current)) {
    return [current, ...zones];
  }
  return zones;
}

export type TimeZoneOption = { value: string; label: string };

export function formatTimeZoneLabel(zone: string, locale = 'en'): string {
  try {
    const offset = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value;
    return offset ? `${zone} (${offset})` : zone;
  } catch {
    return zone;
  }
}

export function timeZoneOptions(current?: string, locale = 'en'): TimeZoneOption[] {
  return timeZoneChoices(current).map((value) => ({
    value,
    label: formatTimeZoneLabel(value, locale),
  }));
}

export function formatStamp(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat('en-CA', { ...stampOpts, timeZone }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { ...stampOpts, timeZone: 'UTC' }).format(d);
  }
}

export function formatCalendarDate(value: string, locale = 'en'): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
