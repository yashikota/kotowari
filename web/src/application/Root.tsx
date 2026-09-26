import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Group } from '@mantine/core';
import { useLocaleSync } from './LocaleSync.tsx';
import { EventScope, mediator } from './mediator.ts';
import type { Overlay } from './mediator.ts';
import {
  globalNavigationSequenceFromKeyboard,
  initiativeCreateSequenceFromKeyboard,
  isSubmitShortcut,
  projectCreateSequenceFromKeyboard,
} from '../keymap.ts';
import type { GlobalNavigationAction } from '../keymap.ts';

const ScopeContext = createContext(mediator.root);
const GLOBAL_NAVIGATION_HREF: Record<GlobalNavigationAction, string> = {
  inbox: '/inbox',
  agent: '/agent',
  'my-issues': '/issues?assignee=self',
  backlog: '/issues?status=backlog',
  'all-issues': '/issues',
  cycles: '/cycles',
  'current-cycle': '/cycles?scope=current',
  'upcoming-cycle': '/cycles?scope=upcoming',
  projects: '/projects',
  initiatives: '/initiatives',
  settings: '/config',
};

export function PresenterScope({ name, children }: { name: string; children: ReactNode }) {
  const parent = useContext(ScopeContext);
  const id = useId();
  const scope = useMemo(() => new EventScope(`${name}:${id}`, parent), [name, id, parent]);
  useLayoutEffect(() => {
    scope.active = true;
    mediator.scopes.set(scope.id, scope);
    return () => {
      scope.active = false;
      mediator.scopes.delete(scope.id);
    };
  }, [scope]);
  return (
    <ScopeContext.Provider value={scope}>
      <div style={{ display: 'contents' }} data-presenter={scope.id}>
        {children}
      </div>
    </ScopeContext.Provider>
  );
}

export function useIntent() {
  const scope = useContext(ScopeContext);
  return useMemo(
    () => (type: string, payload?: unknown) => mediator.dispatch(scope, type, payload),
    [scope],
  );
}

export function useIntentHandler(type: string, handler: (payload: unknown) => unknown) {
  const scope = useContext(ScopeContext);
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  useLayoutEffect(() => {
    scope.handlers.set(type, (payload) => latest.current(payload));
    return () => {
      scope.handlers.delete(type);
    };
  }, [scope, type]);
}

/** Stable event ports; View closures only supply DOM values and row parameters. */
export function useActions<T extends object>(handlers: T): T {
  const scope = useContext(ScopeContext);
  const current = useRef(handlers);
  useLayoutEffect(() => {
    current.current = handlers;
  });
  const names = Object.keys(handlers).join('\0');
  useLayoutEffect(() => {
    const keys = names.split('\0').filter(Boolean);
    for (const name of keys)
      scope.handlers.set(name, (args) =>
        (current.current as Record<string, (...values: never[]) => unknown>)[name]!(
          ...(args as never[]),
        ),
      );
    return () => {
      for (const name of keys) scope.handlers.delete(name);
    };
  }, [scope, names]);
  return useMemo(() => {
    const actions: Record<string, (...args: never[]) => unknown> = {};
    for (const name of names.split('\0').filter(Boolean))
      actions[name] = (...args) => mediator.dispatch(scope, name, args);
    return actions as T;
  }, [scope, names]);
}

export function useKeyboard(handler: (event: KeyboardEvent) => boolean, list = false) {
  const scope = useContext(ScopeContext);
  const current = useRef(handler);
  useLayoutEffect(() => {
    current.current = handler;
  });
  useLayoutEffect(() => {
    scope.handlers.set('keyboard', (event) => current.current(event as KeyboardEvent));
    if (list) scope.handlers.set('list', () => true);
    return () => {
      scope.handlers.delete('keyboard');
      scope.handlers.delete('list');
    };
  }, [scope, list]);
}

export function useOverlay() {
  const overlay = useSyncExternalStore(mediator.subscribe, mediator.getOverlay);
  const set = (name: Overlay) => (value: boolean | ((previous: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(mediator.getOverlay() === name) : value;
    if (next) mediator.open(name);
    else if (mediator.getOverlay() === name) mediator.open('none');
  };
  return { overlay, set };
}

/** Presenter-owned transient UI state, arbitrated by the same Mediator as actions. */
export function useMachineFlag(name: string, defaultValue = false) {
  const scope = useContext(ScopeContext);
  const key = `${scope.id}:${name}`;
  const value = useSyncExternalStore(mediator.subscribe, () => mediator.getFlag(key, defaultValue));
  useLayoutEffect(() => () => mediator.clearFlag(key), [key]);
  const set = useMemo(
    () => (next: boolean | ((previous: boolean) => boolean)) =>
      mediator.setFlag(key, next, defaultValue),
    [key, defaultValue],
  );
  return [value, set] as const;
}

/** A small set of transient controls belongs to Root so sibling scopes can observe it. */
export function useRootMachineFlag(name: string, defaultValue = false) {
  const key = `${mediator.root.id}:${name}`;
  const value = useSyncExternalStore(mediator.subscribe, () => mediator.getFlag(key, defaultValue));
  const set = useMemo(
    () => (next: boolean | ((previous: boolean) => boolean)) =>
      mediator.setFlag(key, next, defaultValue),
    [key, defaultValue],
  );
  return [value, set] as const;
}

function ErrorNoticeView({
  error,
  dismissLabel,
  onDismiss,
}: {
  error: string;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  return error ? (
    <Alert
      color="red"
      variant="filled"
      role="alert"
      styles={{ root: { position: 'fixed', bottom: 16, right: 16, zIndex: 1000, maxWidth: 420 } }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <span>{error}</span>
        <Button type="button" variant="white" color="red" size="compact-xs" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </Group>
    </Alert>
  ) : null;
}

function ErrorNoticeBinding() {
  const { t } = useTranslation();
  const error = useSyncExternalStore(mediator.subscribe, mediator.getError);
  const actions = useActions({ onDismiss: () => mediator.clearError() });
  return (
    <ErrorNoticeView
      error={error}
      dismissLabel={t('common.dismiss')}
      onDismiss={actions.onDismiss}
    />
  );
}

export function Root({
  children,
  navigate,
}: {
  children: ReactNode;
  navigate: (href: string) => Promise<void>;
}) {
  useLocaleSync();
  useIntentHandler('issues.find.open', () => mediator.setFlag('Root:issues.find', true));
  useIntentHandler('project.create.open', () => {
    mediator.setFlag('Root:project.create', true);
    return navigate('/projects');
  });
  useIntentHandler('initiative.create.open', () => {
    mediator.setFlag('Root:initiative.create', true);
    return navigate('/initiatives');
  });
  const overlay = useSyncExternalStore(mediator.subscribe, mediator.getOverlay);
  const restore = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    mediator.root.handlers.set('navigate', (href) => navigate(href as string));
    return () => {
      mediator.root.handlers.delete('navigate');
    };
  }, [navigate]);
  useLayoutEffect(() => {
    if (overlay === 'none') {
      if (restore.current?.isConnected) restore.current.focus();
      restore.current = null;
    } else if (!restore.current) {
      // Autofocus has already run; remember the last focus outside the overlay.
      restore.current = previousFocus;
    }
  }, [overlay]);
  useEffect(() => {
    let projectCreatePendingSince: number | null = null;
    let initiativeCreatePendingSince: number | null = null;
    let globalNavigationPendingSince: number | null = null;
    const focus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && !event.target.closest('[role="dialog"]'))
        previousFocus = event.target;
    };
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) {
        projectCreatePendingSince = null;
        initiativeCreatePendingSince = null;
        globalNavigationPendingSince = null;
        return;
      }
      if (isSubmitShortcut(event) && event.target instanceof HTMLElement) {
        const form = event.target.closest('form');
        if (form) {
          event.preventDefault();
          form.requestSubmit();
          return;
        }
      }
      const dialog = [
        ...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      ].find((candidate) => candidate.getClientRects().length > 0);
      if (dialog && event.key === 'Tab') {
        const items = [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = items[0],
          last = items.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
        return;
      }
      if (dialog && event.key === 'Escape') {
        projectCreatePendingSince = null;
        initiativeCreatePendingSince = null;
        globalNavigationPendingSince = null;
        event.preventDefault();
        mediator.open('none');
        return;
      }
      if (dialog) {
        projectCreatePendingSince = null;
        initiativeCreatePendingSince = null;
        globalNavigationPendingSince = null;
      }
      const projectCreate = projectCreateSequenceFromKeyboard(
        event,
        projectCreatePendingSince,
        Date.now(),
      );
      projectCreatePendingSince = projectCreate.pendingSince;
      if (projectCreate.action === 'new-project') {
        event.preventDefault();
        mediator.dispatch(mediator.root, 'project.create.open', undefined);
        return;
      }
      const initiativeCreate = initiativeCreateSequenceFromKeyboard(
        event,
        initiativeCreatePendingSince,
        Date.now(),
      );
      initiativeCreatePendingSince = initiativeCreate.pendingSince;
      if (initiativeCreate.action === 'new-initiative') {
        event.preventDefault();
        mediator.dispatch(mediator.root, 'initiative.create.open', undefined);
        return;
      }
      const globalNavigation = globalNavigationSequenceFromKeyboard(
        event,
        globalNavigationPendingSince,
        Date.now(),
      );
      globalNavigationPendingSince = globalNavigation.pendingSince;
      if (globalNavigation.action) {
        event.preventDefault();
        globalNavigationPendingSince = null;
        mediator.dispatch(
          mediator.root,
          'navigate',
          GLOBAL_NAVIGATION_HREF[globalNavigation.action],
        );
        return;
      }
      let scope =
        event.target instanceof Element
          ? mediator.scopes.get(
              event.target.closest('[data-presenter]')?.getAttribute('data-presenter') ?? '',
            )
          : undefined;
      if (dialog) {
        // A modal consumes all unhandled keys; never send them to a background list.
        if (!(event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) return;
      } else if (!scope || !scope.handlers.has('keyboard')) {
        scope = [...mediator.scopes.values()].find((s) => s.handlers.has('list')) ?? scope;
      }
      scope ??= [...mediator.scopes.values()].find((s) => s.id.startsWith('Shell:'));
      if (scope && mediator.keyboard(scope, event)) globalNavigationPendingSince = null;
    };
    document.addEventListener('keydown', key);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('focusin', focus);
    };
  }, []);
  return (
    <ScopeContext.Provider value={mediator.root}>
      <div
        style={{ display: 'contents' }}
        onClickCapture={(event) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          const link =
            event.target instanceof Element
              ? event.target.closest<HTMLAnchorElement>('a[href]')
              : null;
          if (!link || link.target || link.hasAttribute('download')) return;
          const action = link.dataset.presenterAction;
          const scope =
            mediator.scopes.get(
              link.closest('[data-presenter]')?.getAttribute('data-presenter') ?? '',
            ) ?? mediator.root;
          if (action) {
            event.preventDefault();
            mediator.dispatch(scope, action, []);
            return;
          }
          const url = new URL(link.href);
          if (
            url.origin !== location.origin ||
            url.pathname.startsWith('/api/') ||
            link.getAttribute('href')?.startsWith('#')
          )
            return;
          event.preventDefault();
          mediator.dispatch(scope, 'navigate', url.pathname + url.search + url.hash);
        }}
      >
        {children}
      </div>
      <PresenterScope name="ErrorNotice">
        <ErrorNoticeBinding />
      </PresenterScope>
    </ScopeContext.Provider>
  );
}
let previousFocus: HTMLElement | null = null;
