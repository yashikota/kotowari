import { StrictMode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './i18n/index.ts';
import '@mantine/core/styles.css';
import './global.css';
import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import { router } from './router.tsx';
import { Root } from './application/Root.tsx';
import { getPersonalPreferences, PERSONAL_PREFERENCES_EVENT } from './preferences.ts';
import { themeForFontSize } from './theme.ts';
import { installDemoApi } from './demo-api.ts';

if (import.meta.env.VITE_DEMO === 'true') {
  installDemoApi();
}

const el = document.getElementById('root');
if (!el) {
  throw new Error('root element missing');
}

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function App() {
  const [preferences, setPreferences] = useState(getPersonalPreferences);
  useEffect(() => {
    const refresh = () => setPreferences(getPersonalPreferences());
    window.addEventListener(PERSONAL_PREFERENCES_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PERSONAL_PREFERENCES_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.pointerCursors = String(preferences.pointerCursors);
    root.dataset.underlineLinks = String(preferences.underlineLinks);
  }, [preferences.pointerCursors, preferences.underlineLinks]);
  const appTheme = useMemo(() => themeForFontSize(preferences.fontSize), [preferences.fontSize]);

  return (
    <MantineProvider
      theme={appTheme}
      colorSchemeManager={localStorageColorSchemeManager({ key: 'kotowari.color-scheme' })}
      defaultColorScheme="light"
    >
      <Root navigate={(href) => router.navigate({ href })}>
        <RouterProvider router={router} />
      </Root>
    </MantineProvider>
  );
}
