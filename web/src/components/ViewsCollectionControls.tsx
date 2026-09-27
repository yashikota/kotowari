import { useState } from 'react';
import { ActionIcon, Button, Group, Popover, Select, Stack, Text } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type ViewCollectionOrder = 'name' | 'updated';
type ViewCollectionDirection = 'asc' | 'desc';
type ViewDisplayProperty = 'created' | 'updated';

export function ViewsCollectionControls({
  order,
  direction,
  displayProperties,
  onOrderChange,
  onToggleDirection,
  onToggleDisplayProperty,
}: {
  order: ViewCollectionOrder;
  direction: ViewCollectionDirection;
  displayProperties: ViewDisplayProperty[];
  onOrderChange: (order: ViewCollectionOrder) => void;
  onToggleDirection: () => void;
  onToggleDisplayProperty: (property: ViewDisplayProperty) => void;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const directionIcon =
    direction === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      shadow="md"
      width={300}
      withinPortal
    >
      <Popover.Target>
        <Button
          type="button"
          size="xs"
          variant="subtle"
          leftSection={<IconAdjustmentsHorizontal size={14} aria-hidden />}
          aria-label={t('views.displayOptions')}
          aria-expanded={opened}
          onClick={() => setOpened((current) => !current)}
        >
          {t('views.displayOptions')}
        </Button>
      </Popover.Target>
      <Popover.Dropdown aria-label={t('views.displayOptions')}>
        <Stack gap="md">
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <Select
              aria-label={t('views.ordering')}
              label={t('views.ordering')}
              value={order}
              onChange={(value) => {
                if (value === 'name' || value === 'updated') onOrderChange(value);
              }}
              data={[
                { value: 'name', label: t('views.order.name') },
                { value: 'updated', label: t('views.order.updated') },
              ]}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
              style={{ flex: 1 }}
            />
            <ActionIcon
              type="button"
              variant="default"
              aria-label={t('views.direction', {
                direction: t(`views.${direction === 'asc' ? 'ascending' : 'descending'}`),
              })}
              title={t('views.direction', {
                direction: t(`views.${direction === 'asc' ? 'ascending' : 'descending'}`),
              })}
              onClick={onToggleDirection}
            >
              {directionIcon}
            </ActionIcon>
          </Group>
          <Stack gap={6}>
            <Text size="xs" c="dimmed" fw={500}>
              {t('views.displayProperties')}
            </Text>
            <Group gap={6} wrap="wrap">
              {(['created', 'updated'] as const).map((property) => {
                const selected = displayProperties.includes(property);
                return (
                  <Button
                    key={property}
                    type="button"
                    size="compact-xs"
                    variant={selected ? 'light' : 'default'}
                    color={selected ? 'blue' : 'gray'}
                    radius="xl"
                    aria-pressed={selected}
                    onClick={() => onToggleDisplayProperty(property)}
                  >
                    {t(`views.properties.${property}`)}
                  </Button>
                );
              })}
            </Group>
          </Stack>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
