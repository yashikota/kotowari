import { Button, Checkbox, Group, NativeSelect, Popover, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ChangeEvent } from 'react';
import type { DocumentDisplay } from '../page-list.ts';

type DisplayHandlers = {
  onOnlyMyProjects: (event: ChangeEvent<HTMLInputElement>) => void;
  onGrouping: (event: ChangeEvent<HTMLSelectElement>) => void;
  onOrder: (event: ChangeEvent<HTMLSelectElement>) => void;
  onDirection: () => void;
  onShowInactive: (event: ChangeEvent<HTMLInputElement>) => void;
  onShowCreated: (event: ChangeEvent<HTMLInputElement>) => void;
  onShowUpdated: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function DocumentListDisplayOptions({
  model,
  opened,
  onChange,
}: {
  model: DocumentDisplay & { handlers: DisplayHandlers };
  opened: boolean;
  onChange: (opened: boolean) => void;
}) {
  const { t } = useTranslation();
  const { handlers } = model;
  return (
    <Popover
      opened={opened}
      onChange={onChange}
      onDismiss={() => onChange(false)}
      trapFocus
      returnFocus
      position="bottom-end"
      width={320}
      withinPortal
    >
      <Popover.Target>
        <Button variant="default" onClick={() => onChange(!opened)} aria-expanded={opened}>
          {t('displayOptions.button')}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <NativeSelect
            aria-label={t('documentList.grouping')}
            value={model.grouping}
            onChange={handlers.onGrouping}
            data={[
              { value: 'project', label: t('documentList.project') },
              { value: 'none', label: t('documentList.noGrouping') },
            ]}
          />
          <NativeSelect
            aria-label={t('documentList.ordering')}
            value={model.order}
            onChange={handlers.onOrder}
            data={[
              { value: 'name', label: t('documentList.name') },
              { value: 'created', label: t('documentList.created') },
              { value: 'updated', label: t('documentList.updated') },
            ]}
          />
          <Button variant="default" onClick={handlers.onDirection}>
            {t(model.direction === 'asc' ? 'documentList.ascending' : 'documentList.descending')}
          </Button>
          <Group px="sm" pb="sm">
            <Checkbox
              label={t('documentList.onlyMyProjects')}
              checked={model.onlyMyProjects}
              onChange={handlers.onOnlyMyProjects}
            />
            <Checkbox
              label={t('documentList.showInactive')}
              checked={model.showInactive}
              onChange={handlers.onShowInactive}
            />
            <Checkbox
              label={t('documentList.created')}
              checked={model.showCreated}
              onChange={handlers.onShowCreated}
            />
            <Checkbox
              label={t('documentList.updated')}
              checked={model.showUpdated}
              onChange={handlers.onShowUpdated}
            />
          </Group>{' '}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
