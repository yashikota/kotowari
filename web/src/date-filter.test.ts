import { expect, it } from 'vite-plus/test';
import { dateBeforePeriod, matchesDocumentDate } from './date-filter.ts';

it('clamps month and leap-year relative thresholds', () => {
  const now = new Date(2024, 2, 31, 12);
  expect(dateBeforePeriod(now, 'last:1m')).toEqual(new Date(2024, 1, 29, 12));
  expect(dateBeforePeriod(new Date(2024, 1, 29, 12), 'last:1y')).toEqual(new Date(2023, 1, 28, 12));
  expect(dateBeforePeriod(now, 'bad')).toBeUndefined();
});
it('includes the relative boundary and rejects invalid dates', () => {
  const now = new Date(2026, 4, 15, 12);
  const filter = { field: 'createdAt', range: 'last:1w', from: '', to: '' } as const;
  expect(matchesDocumentDate(new Date(2026, 4, 8, 12).toISOString(), filter, now)).toBe(true);
  expect(matchesDocumentDate(new Date(2026, 4, 8, 11).toISOString(), filter, now)).toBe(false);
  expect(matchesDocumentDate('bad', filter, now)).toBe(false);
});
it('includes both custom date boundaries using local calendar days', () => {
  const filter = {
    field: 'updatedAt',
    range: 'custom',
    from: '2026-05-10',
    to: '2026-05-11',
  } as const;
  expect(matchesDocumentDate(new Date(2026, 4, 10, 0).toISOString(), filter)).toBe(true);
  expect(matchesDocumentDate(new Date(2026, 4, 11, 23, 59).toISOString(), filter)).toBe(true);
  expect(matchesDocumentDate(new Date(2026, 4, 12, 0).toISOString(), filter)).toBe(false);
});
