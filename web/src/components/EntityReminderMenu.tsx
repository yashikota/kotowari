import { Button, Menu } from '@mantine/core';
import type { useReminderEditor } from '../presenters/useReminderEditor.ts';
import { ReminderDialog } from './ReminderDialog.tsx';
import { useTranslation } from 'react-i18next';

import { reminderPreset, type ReminderPreset } from '../reminder-dates.ts';

type Props = {
  editor: ReturnType<typeof useReminderEditor>['data'];
  onOpenCustom: () => unknown;
  onCloseCustom: () => void;
  onCustomChange: (value: string) => void;
  onCustomSave: () => unknown;
  onRetry: () => unknown;
  reminderAt?: string | null;
  opened: boolean;
  onMenuChange: (opened: boolean) => void;
  onSetReminder: (value: Date | null) => Promise<void>;
};

export function EntityReminderMenu({
  editor,
  onOpenCustom,
  onCloseCustom,
  onCustomChange,
  onCustomSave,
  onRetry,
  reminderAt,
  opened,
  onMenuChange,
  onSetReminder,
}: Props) {
  const { t } = useTranslation();
  function openCustom() {
    onOpenCustom();
    onMenuChange(false);
  }
  async function setPreset(kind: ReminderPreset) {
    onMenuChange(false);
    await onSetReminder(reminderPreset(kind) ?? null);
  }
  return (
    <>
      <Menu opened={opened && !editor.saving} onChange={onMenuChange} withinPortal>
        <Menu.Target>
          <Button
            type="button"
            loading={editor.saving}
            variant={reminderAt ? 'light' : 'default'}
            aria-keyshortcuts="Shift+H"
            title={reminderAt ? new Date(reminderAt).toLocaleString() : undefined}
          >
            {t('issueActions.remindMe')}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={() => void setPreset('hour')}>
            {t('issueActions.reminder.hour')}
          </Menu.Item>
          <Menu.Item onClick={() => void setPreset('tomorrow')}>
            {t('issueActions.reminder.tomorrow')}
          </Menu.Item>
          <Menu.Item onClick={() => void setPreset('week')}>
            {t('issueActions.reminder.week')}
          </Menu.Item>
          <Menu.Item onClick={() => void setPreset('month')}>
            {t('issueActions.reminder.month')}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item onClick={openCustom}>{t('issueActions.reminder.custom')}</Menu.Item>
          {reminderAt ? (
            <Menu.Item onClick={() => void onSetReminder(null)}>
              {t('issueActions.reminder.clear')}
            </Menu.Item>
          ) : null}
        </Menu.Dropdown>
      </Menu>
      <ReminderDialog
        data={editor}
        onClose={onCloseCustom}
        onChange={onCustomChange}
        onSave={onCustomSave}
        onRetry={onRetry}
      />
    </>
  );
}
