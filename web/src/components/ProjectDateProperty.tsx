import { Button, Popover, Stack, TextInput } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCalendarDate } from '../time.ts';

export function ProjectDateProperty({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [opened, setOpened] = useState(false);

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" offset={4}>
      <Popover.Target>
        <Button
          type="button"
          variant="default"
          size="xs"
          leftSection={<IconCalendarEvent size={14} stroke={1.7} aria-hidden="true" />}
          aria-label={t('projectDate.change', { field: label })}
          onClick={() => setOpened((current) => !current)}
          styles={{ root: { borderRadius: 999 } }}
        >
          {value ? formatCalendarDate(value, i18n.language) : label}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <TextInput
            autoFocus
            type="date"
            aria-label={t('projectDate.set', { field: label })}
            value={value}
            onChange={(event) => {
              onChange(event.currentTarget.value);
              setOpened(false);
            }}
          />
          {value && (
            <Button
              type="button"
              variant="subtle"
              size="xs"
              onClick={() => {
                onChange('');
                setOpened(false);
              }}
            >
              {t('projectDate.clear')}
            </Button>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
