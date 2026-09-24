import { createTheme } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import type { FontSize } from './preferences.ts';

const baseTheme = {
  primaryColor: 'indigo',
  colors: {
    indigo: [
      '#f0f1fb',
      '#e2e4f7',
      '#c7cbef',
      '#a5abe4',
      '#828bd8',
      '#6e79d4',
      '#5e6ad2',
      '#4c57b5',
      '#3c478f',
      '#303a70',
    ],
  },
  fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: 'IBM Plex Mono, ui-monospace, monospace',
  headings: { fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif' },
  fontSizes: { xs: '0.6875rem', sm: '0.75rem', md: '0.8125rem' },
  defaultRadius: 'sm',
  radius: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
  components: {
    Button: {
      styles: { root: { fontWeight: 500 } },
    },
    NavLink: {
      styles: {
        root: {
          minHeight: 28,
          padding: '5px 8px',
          borderRadius: 'var(--mantine-radius-sm)',
          color: 'var(--mantine-color-dimmed)',
          fontSize: 'var(--mantine-font-size-sm)',
        },
        section: { color: 'var(--mantine-color-dimmed)' },
      },
    },
    NativeSelect: {
      styles: {
        input: {
          height: 30,
          minHeight: 30,
          borderColor: 'var(--mantine-color-default-border)',
          fontSize: 'var(--mantine-font-size-sm)',
        },
      },
    },
  },
} satisfies MantineThemeOverride;

const fontSizes: Record<FontSize, { xs: string; sm: string; md: string }> = {
  small: { xs: '0.625rem', sm: '0.6875rem', md: '0.75rem' },
  default: { xs: '0.6875rem', sm: '0.75rem', md: '0.8125rem' },
  large: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
};

export function themeForFontSize(fontSize: FontSize) {
  return createTheme({ ...baseTheme, fontSizes: fontSizes[fontSize] });
}

export const theme = themeForFontSize('default');
