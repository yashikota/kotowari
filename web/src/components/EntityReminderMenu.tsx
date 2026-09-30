import { Button, Group, Menu, Modal, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type ReminderPreset = 'hour' | 'tomorrow' | 'week' | 'month';

type Props = {
  reminderAt?: string | null;
  opened: boolean;
  onMenuChange: (opened: boolean) => void;
  onSetReminder: (value: Date | null) => Promise<void>;
};

function presetDate(kind: ReminderPreset) {
  const now = new Date();
  const next = new Date(now);
  if (kind === 'hour') {
    next.setHours(next.getHours() + 1);
    next.setSeconds(0, 0);
  }
  if (kind === 'tomorrow') next.setDate(next.getDate() + 1);
  if (kind === 'week') {
    const daysToMonday = (8 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysToMonday);
  }
  if (kind === 'month') next.setMonth(next.getMonth() + 1);
  if (kind !== 'hour') next.setHours(9, 0, 0, 0);
  return next;
}

function localDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function EntityReminderMenu({ reminderAt, opened, onMenuChange, onSetReminder }: Props) {
  const { t } = useTranslation();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  async function setPreset(kind: ReminderPreset) {
    await onSetReminder(presetDate(kind));
  }

  function openCustom() {
    setCustomValue(
      localDateTime(reminderAt) ||
        localDateTime(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    );
    setCustomOpen(true);
    onMenuChange(false);
  }

  async function saveCustom() {
    const value = new Date(customValue);
    if (Number.isNaN(value.getTime())) return;
    setCustomOpen(false);
    await onSetReminder(value);
  }

  return (
    <>
      <Menu opened={opened} onChange={onMenuChange} withinPortal>
        <Menu.Target>
          <Button
            type="button"
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
      <Modal
        opened={customOpen}
        onClose={() => setCustomOpen(false)}
        title={t('issueActions.reminder.customTitle')}
        centered
      >
        <Stack>
          <TextInput
            type="datetime-local"
            label={t('issueActions.reminder.dateTime')}
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCustomOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void saveCustom()} disabled={!customValue}>
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
