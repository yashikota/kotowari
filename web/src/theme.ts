import { createTheme, type MantineColorsTuple } from '@mantine/core';

const gold: MantineColorsTuple = [
  '#f5efe3',
  '#e8e4d9',
  '#d4c9a8',
  '#c4a574',
  '#b8935a',
  '#a67f45',
  '#8f6b38',
  '#73552c',
  '#5c4423',
  '#4a371c',
];

export const theme = createTheme({
  primaryColor: 'gold',
  colors: { gold },
  fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: 'IBM Plex Mono, ui-monospace, monospace',
  headings: { fontFamily: 'Literata, Times New Roman, serif' },
  defaultRadius: 'sm',
});
