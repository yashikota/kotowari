import { Alert, Box, Button, Group, Popover, SimpleGrid, Textarea, TextInput } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ComponentProps, Ref } from 'react';
import { ViewIcon } from './ViewIcon.tsx';
import type { ViewIconName } from '../types.ts';

type HeaderModel = {
  name: string;
  description: string;
  icon: ViewIconName;
  iconPickerOpen: boolean;
  iconOptions: readonly ViewIconName[];
  saving: boolean;
  error: string;
  handlers: {
    onNameChange: NonNullable<ComponentProps<typeof TextInput>['onChange']>;
    onNameKeyDown?: ComponentProps<typeof TextInput>['onKeyDown'];
    onDescriptionChange: NonNullable<ComponentProps<typeof Textarea>['onChange']>;
    onIconPickerChange: (opened: boolean) => unknown;
    onIconChange: (name: ViewIconName) => unknown;
    onCancel: () => unknown;
    onCreate: () => unknown;
  };
};

export function ViewBuilderHeader({
  model,
  nameRef,
}: {
  model: HeaderModel;
  nameRef: Ref<HTMLInputElement>;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Group
        component="header"
        px="md"
        py="xs"
        gap="sm"
        wrap="wrap"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Popover
          opened={model.iconPickerOpen}
          onChange={model.handlers.onIconPickerChange}
          position="bottom-start"
          shadow="md"
        >
          <Popover.Target>
            <Button
              type="button"
              variant="default"
              px="xs"
              aria-label={t('viewBuilder.chooseIcon')}
              disabled={model.saving}
              onClick={() => model.handlers.onIconPickerChange(!model.iconPickerOpen)}
            >
              <ViewIcon name={model.icon} />
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <SimpleGrid cols={6} spacing={4} aria-label={t('viewBuilder.iconChoices')}>
              {model.iconOptions.map((name) => (
                <Button
                  key={name}
                  type="button"
                  variant={model.icon === name ? 'light' : 'subtle'}
                  color="gray"
                  aria-label={t(`viewBuilder.icons.${name}`)}
                  aria-pressed={model.icon === name}
                  onClick={() => {
                    model.handlers.onIconChange(name);
                    model.handlers.onIconPickerChange(false);
                  }}
                >
                  <ViewIcon name={name} />
                </Button>
              ))}
            </SimpleGrid>
          </Popover.Dropdown>
        </Popover>
        <TextInput
          ref={nameRef}
          data-autofocus
          label={t('viewBuilder.name')}
          disabled={model.saving}
          value={model.name}
          maxLength={100}
          onChange={model.handlers.onNameChange}
          onKeyDown={model.handlers.onNameKeyDown}
          style={{ flex: '1 1 240px', minWidth: 0 }}
        />
        <Button
          type="button"
          variant="default"
          onClick={model.handlers.onCancel}
          disabled={model.saving}
        >
          <IconChevronLeft size={14} aria-hidden="true" />
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={model.handlers.onCreate}
          loading={model.saving}
          disabled={!model.name.trim()}
        >
          {t('viewBuilder.createView')}
        </Button>
      </Group>
      {model.error ? (
        <Box px="md" pt="sm">
          <Alert color="red" role="alert" title={t('viewBuilder.saveFailed')}>
            {model.error}
          </Alert>
        </Box>
      ) : null}
      <Textarea
        label={t('viewBuilder.description')}
        disabled={model.saving}
        placeholder={t('viewBuilder.descriptionPlaceholder')}
        value={model.description}
        maxLength={1000}
        autosize
        minRows={1}
        maxRows={3}
        onChange={model.handlers.onDescriptionChange}
        px="md"
        py={6}
      />
    </>
  );
}
