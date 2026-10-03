import { useTranslation } from 'react-i18next';
import { DateEditorDialog } from './DateEditorDialog.tsx';
import type { useReminderEditor } from '../presenters/useReminderEditor.ts';

export function ReminderDialog(props: {
  data: ReturnType<typeof useReminderEditor>['data'];
  onClose: () => void;
  onChange: (value: string) => void;
  onSave: () => unknown;
  onRetry: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <DateEditorDialog
      {...props}
      inputType="datetime-local"
      labels={{
        title: t('issueActions.reminder.customTitle'),
        clearTitle: t('issueActions.reminder.clear'),
        input: t('issueActions.reminder.dateTime'),
        hint: t('issueActions.reminder.hint'),
        saving: t('issueActions.reminder.saving'),
        clearing: t('issueActions.reminder.clearing'),
        failed: t('issueActions.reminder.failed'),
        clearFailed: t('issueActions.reminder.clearFailed'),
        retry: t('issueActions.reminder.retry'),
        clearRetry: t('issueActions.reminder.retryClear'),
        clearHint: t('issueActions.reminder.clearHint'),
      }}
    />
  );
}
