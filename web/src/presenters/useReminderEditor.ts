import { useRetriableSave } from './useRetriableSave.ts';
import { useEffect, useState } from 'react';
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
  const [validation, setValidation] = useState('');
  const [validationAttempt, setValidationAttempt] = useState(0);
  const mutation = useRetriableSave<Date | null>({
    scope: entityKey,
    save,
    onSuccess: () => {
      setOpened(false);
      onSuccess();
    },
    onFailure: (next) => {
      if (next) setValue(localReminderDateTime(next.toISOString()));
      setOpened(true);
    },
  });
  useEffect(() => {
    setOpened(false);
    setValue('');
    setValidation('');
    setClearing(false);
  }, [entityKey]);
  function write(next: Date | null) {
    if (mutation.isPending()) return;
    setClearing(next === null);
    setValidation('');
    return mutation.write(next);
  }
  return {
    isPending: mutation.isPending,
    data: {
      opened,
      value,
      saving: mutation.saving,
      error: mutation.error,
      validation,
      validationAttempt,
      clearing,
    },
    open: () => {
      if (mutation.isPending()) return;
      setValue(
        localReminderDateTime(reminderAt) ||
          localReminderDateTime(new Date(Date.now() + 3600000).toISOString()),
      );
      mutation.invalidate();
      setClearing(false);
      setValidation('');
      setOpened(true);
    },
    close: () => {
      if (!mutation.isPending()) setOpened(false);
    },
    change: (next: string) => {
      if (mutation.isPending()) return;
      mutation.invalidate();
      setValue(next);
      setValidation('');
    },
    submit: () => {
      if (mutation.isPending()) return;
      const date = new Date(value);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setValidation(t('issueActions.reminder.futureRequired'));
        setValidationAttempt((current) => current + 1);
        return;
      }
      return write(date);
    },
    retry: mutation.retry,
    write,
  };
}
