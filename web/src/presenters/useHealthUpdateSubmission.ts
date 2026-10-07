import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Activity, ProjectHealth } from '../types.ts';
import { useRetriableCreation } from './useRetriableCreation.ts';
import i18n from '../i18n/index.ts';

/** Keep the draft and confirmed post until its activity feed has been refreshed. */
export function useHealthUpdateSubmission({
  scope,
  initialHealth,
  post,
  refresh,
  onConfirmed,
}: {
  scope: string;
  initialHealth: ProjectHealth;
  post: (health: ProjectHealth, body: string) => Promise<Activity>;
  refresh: (isCurrent: () => boolean) => Promise<unknown>;
  onConfirmed: (activity: Activity) => void;
}) {
  const [draft, setDraft] = useState({
    scope,
    opened: false,
    health: initialHealth,
    body: '',
    saved: false,
    edited: false,
    validation: '',
  });
  const generation = useRef(0);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  if (draft.scope !== scope)
    setDraft({
      scope,
      opened: false,
      health: initialHealth,
      body: '',
      saved: false,
      edited: false,
      validation: '',
    });
  useEffect(() => {
    generation.current++;
    return () => {
      generation.current++;
    };
  }, [scope]);
  const transaction = useRetriableCreation({
    scope,
    create: (payload: { health: ProjectHealth; body: string }) =>
      post(payload.health, payload.body),
    open: async (activity) => {
      const token = generation.current;
      onConfirmed(activity);
      await refresh(() => currentScope.current === scope && token === generation.current);
    },
  });
  async function submit() {
    if (transaction.isPending()) return false;
    if (!transaction.hasCreated() && !draft.body.trim()) {
      setDraft((current) => ({ ...current, validation: i18n.t('healthUpdate.bodyRequired') }));
      return false;
    }
    const token = generation.current;
    const success = await transaction.submit({ health: draft.health, body: draft.body.trim() });
    if (success && currentScope.current === scope && token === generation.current)
      setDraft({
        scope,
        opened: false,
        health: draft.health,
        body: '',
        saved: true,
        edited: false,
        validation: '',
      });
    return success;
  }
  return {
    ...draft,
    pending: transaction.submitting,
    error: draft.validation || transaction.error,
    bodyError: draft.validation,
    dirty: Boolean(
      draft.body || (draft.edited && draft.health !== initialHealth) || transaction.created,
    ),
    confirmed: transaction.created,
    isPending: transaction.isPending,
    open: () =>
      setDraft((current) => ({
        ...current,
        opened: true,
        saved: false,
        health: current.edited || transaction.hasCreated() ? current.health : initialHealth,
      })),
    close: () => {
      if (!transaction.isPending()) setDraft((current) => ({ ...current, opened: false }));
    },
    changeHealth: (value: string | null) => {
      if (transaction.isPending() || transaction.hasCreated()) return;
      transaction.invalidate();
      setDraft((current) => ({
        ...current,
        health: (value ?? 'on_track') as ProjectHealth,
        edited: true,
        validation: '',
      }));
    },
    changeBody: (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (transaction.isPending() || transaction.hasCreated()) return;
      transaction.invalidate();
      const body = event.currentTarget.value;
      setDraft((current) => ({ ...current, body, edited: true, validation: '' }));
    },
    submit,
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return submit();
    },
  };
}
