import { describe, expect, it } from 'vite-plus/test';
import { ADR_STATUSES, ADR_STATUS_LABEL, entityDir } from './types.ts';

describe('ADR_STATUSES', () => {
  it('includes rejected between proposed and accepted', () => {
    expect(ADR_STATUSES).toEqual(['proposed', 'rejected', 'accepted', 'deprecated', 'superseded']);
    expect(ADR_STATUS_LABEL.rejected).toBe('Rejected');
  });
});

describe('entityDir', () => {
  it('pads numbers to five digits', () => {
    expect(entityDir(1)).toBe('00001');
    expect(entityDir(12)).toBe('00012');
    expect(entityDir(12345)).toBe('12345');
  });
});
