import { DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vite-plus/test';
import { accessibleColor, contrastRatio } from './contrast.ts';
import { cssVariablesForTheme, theme as override } from '../theme.ts';

const theme = mergeMantineTheme(DEFAULT_THEME, override);

describe('WCAG color foundations', () => {
  it('uses the WCAG luminance formula', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
    expect(accessibleColor('#000000', '#ffffff')).toBe('#000000');
  });
  it('keeps every named semantic palette readable in both schemes', () => {
    const variables = cssVariablesForTheme(theme);
    for (const name of Object.keys(theme.colors).filter((name) => name !== 'dark')) {
      for (const [scheme, background] of [
        [variables.light, '#e2e2e2'],
        [variables.dark, '#424242'],
      ] as const) {
        expect(
          contrastRatio(scheme[`--mantine-color-${name}-text`]!, background),
          name,
        ).toBeGreaterThanOrEqual(7);
        expect(
          contrastRatio(scheme[`--mantine-color-${name}-filled`]!, '#ffffff'),
          name,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(scheme[`--mantine-color-${name}-filled-hover`]!, '#ffffff'),
          name,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('keeps placeholder text, control boundaries and focus visible', () => {
    const variables = cssVariablesForTheme(theme);
    for (const [scheme, background] of [
      [variables.light, '#e2e2e2'],
      [variables.dark, '#424242'],
    ] as const) {
      expect(contrastRatio(scheme['--mantine-color-dimmed']!, background)).toBeGreaterThanOrEqual(
        7,
      );
      expect(
        contrastRatio(scheme['--mantine-color-placeholder']!, background),
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(scheme['--kotowari-control-border']!, background),
      ).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(scheme['--kotowari-focus']!, background)).toBeGreaterThanOrEqual(3);
    }
  });
});
