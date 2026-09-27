import { Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PROJECT_DISPLAY_PROPERTIES, type ProjectDisplayProperty } from '../project-display.ts';

export function ProjectDisplayPropertyOptions({
  selectedProperties,
  onToggle,
  properties = PROJECT_DISPLAY_PROPERTIES,
}: {
  selectedProperties: readonly ProjectDisplayProperty[];
  onToggle: (property: ProjectDisplayProperty) => void;
  properties?: readonly ProjectDisplayProperty[];
}) {
  const { t } = useTranslation();

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        {t('projectList.displayProperties')}
      </Text>
      <Group gap={6} wrap="wrap">
        {properties.map((property) => {
          const selected = selectedProperties.includes(property);
          return (
            <Button
              key={property}
              type="button"
              size="compact-xs"
              variant={selected ? 'default' : 'subtle'}
              color="gray"
              radius="xl"
              aria-pressed={selected}
              onClick={() => onToggle(property)}
            >
              {t(`projectList.property.${property}`)}
            </Button>
          );
        })}
      </Group>
    </Stack>
  );
}
