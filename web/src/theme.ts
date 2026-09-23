import { createTheme } from '@mantine/core';

export const theme = createTheme({
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
  defaultRadius: 'xs',
});
