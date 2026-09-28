import { ActionIcon, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { SidebarBadgeStyle, SidebarItemId, SidebarLocation } from '../preferences.ts';

export type SidebarCustomizationGroup = {
  group: string;
  label: string;
  items: { id: SidebarItemId; label: string; location: SidebarLocation }[];
};

export function SidebarCustomizationModal({
  opened,
  onClose,
  groups,
  badgeStyle,
  onBadgeStyleChange,
  onLocationChange,
  onMove,
}: {
  opened: boolean;
  onClose: () => void;
  groups: SidebarCustomizationGroup[];
  badgeStyle: SidebarBadgeStyle;
  onBadgeStyleChange: (style: SidebarBadgeStyle) => void;
  onLocationChange: (id: SidebarItemId, location: SidebarLocation) => void;
  onMove: (id: SidebarItemId, direction: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('config.customizeSidebar')}
      centered
      size="lg"
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          {t('config.sidebarDescription')}
        </Text>
        <Select
          label={t('config.sidebarBadgeStyle')}
          aria-label={t('config.sidebarBadgeStyle')}
          value={badgeStyle}
          onChange={(value) => {
            if (value === 'count' || value === 'dot') onBadgeStyleChange(value);
          }}
          data={[
            { value: 'count', label: t('config.sidebarBadgeStyles.count') },
            { value: 'dot', label: t('config.sidebarBadgeStyles.dot') },
          ]}
          allowDeselect={false}
        />
        {groups.map((section) => (
          <Stack key={section.group} component="section" aria-label={section.label} gap="xs">
            <Text size="sm" fw={600}>
              {section.label}
            </Text>
            {section.items.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('config.sidebarEmpty')}
              </Text>
            ) : (
              section.items.map((item, index) => (
                <Group key={item.id} gap="xs" wrap="nowrap">
                  <Text size="sm" style={{ flex: 1 }} truncate>
                    {item.label}
                  </Text>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    aria-label={t('config.moveSidebarUp', { item: item.label })}
                    disabled={index === 0}
                    onClick={() => onMove(item.id, -1)}
                  >
                    <IconChevronUp size={16} aria-hidden />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    aria-label={t('config.moveSidebarDown', { item: item.label })}
                    disabled={index === section.items.length - 1}
                    onClick={() => onMove(item.id, 1)}
                  >
                    <IconChevronDown size={16} aria-hidden />
                  </ActionIcon>
                  <Select
                    aria-label={t('config.sidebarLocationFor', { item: item.label })}
                    value={item.location}
                    onChange={(value) => {
                      if (
                        value === 'primary' ||
                        value === 'badged' ||
                        value === 'more' ||
                        value === 'hidden'
                      )
                        onLocationChange(item.id, value);
                    }}
                    data={[
                      { value: 'primary', label: t('config.sidebarLocation.primary') },
                      { value: 'badged', label: t('config.sidebarLocation.badged') },
                      { value: 'more', label: t('config.sidebarLocation.more') },
                      { value: 'hidden', label: t('config.sidebarLocation.hidden') },
                    ]}
                    w={190}
                    allowDeselect={false}
                  />
                </Group>
              ))
            )}
          </Stack>
        ))}
      </Stack>
    </Modal>
  );
}
