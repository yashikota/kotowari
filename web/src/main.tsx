import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router.tsx';
import './index.css';
import { Root } from './application/Root.tsx';

const el = document.getElementById('root');
if (!el) {
  throw new Error('root element missing');
}

createRoot(el).render(
  <StrictMode>
    <Root navigate={(href) => router.navigate({ href })}>
      <RouterProvider router={router} />
    </Root>
  </StrictMode>,
);
