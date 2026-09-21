import { useEffect } from 'react';
import { api } from '../api.ts';
import { applyLocale } from '../i18n/index.ts';
import { signals } from './mediator.ts';

export function LocaleSync() {
  useEffect(() => {
    let active = true;

    function syncLocale() {
      api
        .workspace()
        .then((ws) => {
          if (active) {
            applyLocale(ws.locale);
          }
        })
        .catch(() => {});
    }

    syncLocale();
    signals.addEventListener('kotowari:refresh', syncLocale);
    return () => {
      active = false;
      signals.removeEventListener('kotowari:refresh', syncLocale);
    };
  }, []);
  return null;
}
