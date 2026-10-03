import { createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineThemeOverride } from '@mantine/core';
import type { FontSize } from './preferences.ts';
import { designTokens } from './design-system/tokens.ts';

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
  fontFamily: designTokens.typography.fontFamily,
  fontFamilyMonospace: designTokens.typography.monospace,
  headings: { fontFamily: designTokens.typography.fontFamily },
  fontSizes: designTokens.typography.fontSizes.default,
  defaultRadius: 'sm',
  radius: designTokens.radius,
  components: {
    InputWrapper: {
      styles: { error: { fontSize: 'var(--mantine-font-size-sm)' } },
    },
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

export function themeForFontSize(fontSize: FontSize) {
  return createTheme({ ...baseTheme, fontSizes: designTokens.typography.fontSizes[fontSize] });
}

export const theme = themeForFontSize('default');

/** Validation text and invalid field values must remain readable in both schemes. */
export const cssVariablesForTheme: CSSVariablesResolver = () => ({
  variables: {},
  light: { '--mantine-color-error': designTokens.color.errorText.light },
  dark: { '--mantine-color-error': designTokens.color.errorText.dark },
});
