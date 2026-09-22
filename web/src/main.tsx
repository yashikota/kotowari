import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './i18n/index.ts';
import '@mantine/core/styles.css';
import './linear.css';
import { MantineProvider } from '@mantine/core';
import { router } from './router.tsx';
import { Root } from './application/Root.tsx';
import { theme } from './theme.ts';

const el = document.getElementById('root');
if (!el) {
  throw new Error('root element missing');
}

createRoot(el).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Root navigate={(href) => router.navigate({ href })}>
        <RouterProvider router={router} />
      </Root>
    </MantineProvider>
  </StrictMode>,
);
