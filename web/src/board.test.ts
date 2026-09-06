import { describe, expect, it } from 'vite-plus/test';
import { sortOrderForDrop } from './board.ts';

const column = [
  { identifier: 'ISS-1', sortOrder: 1 },
  { identifier: 'ISS-2', sortOrder: 2 },
];

describe('sortOrderForDrop', () => {
  it('appends after the last card in the column', () => {
    expect(sortOrderForDrop(column, 'ISS-9', null)).toBe(3);
  });

  it('inserts before the first card', () => {
    expect(sortOrderForDrop(column, 'ISS-9', 'ISS-1')).toBe(0.5);
  });

  it('inserts between two cards', () => {
    expect(sortOrderForDrop(column, 'ISS-9', 'ISS-2')).toBe(1.5);
  });

  it('starts an empty column at 1', () => {
    expect(sortOrderForDrop([], 'ISS-9', null)).toBe(1);
  });

  it('inserts at the start when beforeId is missing from the column', () => {
    expect(sortOrderForDrop(column, 'ISS-9', 'ISS-99')).toBe(0.5);
  });

  it('ignores the dragged card when it is already in the column', () => {
    expect(
      sortOrderForDrop(
        [
          { identifier: 'ISS-1', sortOrder: 1 },
          { identifier: 'ISS-9', sortOrder: 1.5 },
          { identifier: 'ISS-2', sortOrder: 2 },
        ],
        'ISS-9',
        null,
      ),
    ).toBe(3);
  });
});
