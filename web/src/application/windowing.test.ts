import { expect, it } from 'vite-plus/test';
import { visibleRange } from './windowing.ts';

it('bounds mounted rows independently of dataset size and preserves scroll height', () => {
  for (const count of [100, 5_000, 100_000]) {
    for (const top of [0, 1000, (count - 20) * 38]) {
      const range = visibleRange(count, top, 760, 38);
      expect(range.end - range.start).toBeLessThanOrEqual(37);
      expect(range.before + (range.end - range.start) * 38 + range.after).toBe(count * 38);
    }
  }
});
it('handles an empty list and shrinking data', () => {
  expect(visibleRange(0, 1000, 760, 38)).toEqual({ start: 0, end: 0, before: 0, after: 0 });
  const range = visibleRange(2, 1000, 760, 38);
  expect(range.start).toBeLessThan(2);
  expect(range.end).toBe(2);
});
