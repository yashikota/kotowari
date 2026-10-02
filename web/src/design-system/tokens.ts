/** Shared foundations; semantic colors follow the active Mantine color scheme. */
export const designTokens = {
  color: {
    text: 'var(--mantine-color-text)',
    muted: 'var(--mantine-color-dimmed)',
    surface: 'var(--mantine-color-body)',
    border: 'var(--mantine-color-default-border)',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
  layout: { pageHeaderMinHeight: 48, pagePadding: 16, propertyRowMinHeight: 32 },
  typography: {
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif',
    monospace: 'IBM Plex Mono, ui-monospace, monospace',
    fontSizes: {
      small: { xs: '0.625rem', sm: '0.6875rem', md: '0.75rem' },
      default: { xs: '0.6875rem', sm: '0.75rem', md: '0.8125rem' },
      large: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
    },
  },
} as const;
