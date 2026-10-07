import { ComboboxChevron, createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineThemeOverride } from '@mantine/core';
import type { FontSize } from './preferences.ts';
import { accessibleColor } from './design-system/contrast.ts';
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
    ComboboxChevron: ComboboxChevron.extend({
      styles: (_theme, props) => ({
        chevron: {
          color: props.error ? 'var(--mantine-color-error)' : 'var(--mantine-color-dimmed)',
        },
      }),
      defaultProps: {
        attributes: { chevron: { 'data-contrast-icon': 'Selection indicator' } },
      },
    }),
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

/** Shared semantic colors meet AA on the supported surfaces and hover backgrounds. */
export const cssVariablesForTheme: CSSVariablesResolver = (theme) => {
  const light: Record<string, string> = {
    '--mantine-color-dimmed': '#343a40',
    '--mantine-color-placeholder': '#343a40',
    '--mantine-color-error': '#a61e4d',
    '--mantine-color-anchor': '#3c478f',
    '--mantine-color-default-border': '#737b83',
    '--kotowari-control-border': '#737b83',
    '--kotowari-focus': '#3c478f',
  };
  const dark: Record<string, string> = {
    '--mantine-color-text': '#f1f3f5',
    '--mantine-color-dimmed': '#dee2e6',
    '--mantine-color-placeholder': '#dee2e6',
    '--mantine-color-error': '#ffa8a8',
    '--mantine-color-anchor': '#c7cbef',
    '--mantine-color-default-border': '#a6a7ab',
    '--kotowari-control-border': '#a6a7ab',
    '--kotowari-focus': '#c7cbef',
  };
  for (const [name, palette] of Object.entries(theme.colors)) {
    if (name === 'dark') continue;
    const lightText = accessibleColor(palette[8], '#e2e2e2', 7);
    const darkText = accessibleColor(palette[3], '#424242', 7);
    const filled = accessibleColor(palette[6], '#ffffff');
    const filledHover = accessibleColor(palette[7], '#ffffff');
    for (const scheme of [light, dark]) {
      scheme[`--mantine-color-${name}-filled`] = filled;
      scheme[`--mantine-color-${name}-filled-hover`] = filledHover;
      scheme[`--mantine-color-${name}-contrast`] = '#ffffff';
    }
    for (const suffix of ['text', 'light-color', 'outline']) {
      light[`--mantine-color-${name}-${suffix}`] = lightText;
      dark[`--mantine-color-${name}-${suffix}`] = darkText;
    }
  }
  return { variables: {}, light, dark };
};
