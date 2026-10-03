import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function localReminderDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function useReminderEditor({
  entityKey,
  reminderAt,
  save,
  onSuccess,
}: {
  entityKey: string;
  reminderAt?: string | null;
  save: (value: Date | null) => Promise<void>;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [clearing, setClearing] = useState(false);
  const [opened, setOpened] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const [validationAttempt, setValidationAttempt] = useState(0);
  const pending = useRef(false);
  const failed = useRef<{ value: Date | null } | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    failed.current = null;
    setOpened(false);
    setValue('');
    setSaving(false);
    setError('');
    setValidation('');
    return () => {
      generation.current++;
    };
  }, [entityKey]);

  async function write(next: Date | null) {
    if (pending.current) return;
    const token = generation.current;
    pending.current = true;
    setSaving(true);
    setClearing(next === null);
    setError('');
    setValidation('');
    try {
      await save(next);
      if (generation.current !== token) return;
      failed.current = null;
      setOpened(false);
      onSuccess();
    } catch (cause) {
      if (generation.current !== token) return;
      failed.current = { value: next };
      if (next) setValue(localReminderDateTime(next.toISOString()));
      setError(cause instanceof Error ? cause.message : t('common.error'));
      setOpened(true);
    } finally {
      if (generation.current === token) {
        pending.current = false;
        setSaving(false);
      }
    }
  }
  return {
    data: { opened, value, saving, error, validation, validationAttempt, clearing },
    open: () => {
      if (pending.current) return;
      setValue(
        localReminderDateTime(reminderAt) ||
          localReminderDateTime(new Date(Date.now() + 3600000).toISOString()),
      );
      failed.current = null;
      setClearing(false);
      setError('');
      setValidation('');
      setOpened(true);
    },
    close: () => {
      if (!pending.current) setOpened(false);
    },
    change: (next: string) => {
      if (pending.current) return;
      failed.current = null;
      setValue(next);
      setError('');
      setValidation('');
    },
    submit: () => {
      if (pending.current) return;
      const date = new Date(value);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setValidation(t('issueActions.reminder.futureRequired'));
        setValidationAttempt((current) => current + 1);
        return;
      }
      return write(date);
    },
    retry: () => (failed.current ? write(failed.current.value) : undefined),
    write,
  };
}
