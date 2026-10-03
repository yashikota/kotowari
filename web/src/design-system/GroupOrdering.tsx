import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronUp,
  IconChevronDown,
  IconGripVertical,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import styles from './GroupOrdering.module.css';

type Item = { key: string; label: string; visible: boolean };
export function GroupOrdering({
  groups,
  onBack,
  onMove,
  onVisibilityChange,
  dataAttribute,
  labels,
}: {
  groups: Item[];
  onBack: () => void;
  onMove: (key: string, destinationIndex: number) => void;
  onVisibilityChange: (key: string, visible: boolean) => void;
  dataAttribute: 'data-issue-group' | 'data-project-board-group';
  labels: {
    title: string;
    back: string;
    moveUp: (label: string) => string;
    moveDown: (label: string) => string;
    hide: (label: string) => string;
    show: (label: string) => string;
  };
}) {
  const { t } = useTranslation();
  const visibleCount = groups.filter((group) => group.visible).length;
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Button
          className={styles.control}
          variant="subtle"
          size="xs"
          leftSection={<IconChevronLeft size={14} aria-hidden />}
          onClick={onBack}
        >
          {labels.back}
        </Button>
        <Text size="sm" fw={600}>
          {labels.title}
        </Text>
      </Group>
      <Stack gap={4} role="list" aria-label={labels.title}>
        {groups.map((group, index) => (
          <Group
            key={group.key}
            role="listitem"
            {...{ [dataAttribute]: group.key }}
            className={styles.row}
            gap={4}
            wrap="nowrap"
            p={4}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', group.key);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer.types).includes('text/plain')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              const key = event.dataTransfer.getData('text/plain');
              if (!key || key === group.key || !groups.some((item) => item.key === key)) return;
              event.preventDefault();
              onMove(key, index);
            }}
            style={{
              background: group.visible ? undefined : 'var(--mantine-color-default-hover)',
              color: group.visible ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
            }}
          >
            <IconGripVertical size={14} aria-hidden />
            <Text size="sm" truncate title={group.label} style={{ flex: 1, minWidth: 0 }}>
              {group.label}
            </Text>
            <ActionIcon
              className={styles.control}
              variant="subtle"
              size="sm"
              aria-label={labels.moveUp(group.label)}
              disabled={index === 0}
              onClick={() => onMove(group.key, index - 1)}
            >
              <IconChevronUp size={14} aria-hidden />
            </ActionIcon>
            <ActionIcon
              className={styles.control}
              variant="subtle"
              size="sm"
              aria-label={labels.moveDown(group.label)}
              disabled={index === groups.length - 1}
              onClick={() => onMove(group.key, index + 1)}
            >
              <IconChevronDown size={14} aria-hidden />
            </ActionIcon>
            <Button
              className={styles.toggle}
              variant="subtle"
              size="compact-xs"
              aria-pressed={group.visible}
              aria-label={group.visible ? labels.hide(group.label) : labels.show(group.label)}
              disabled={group.visible && visibleCount <= 1}
              onClick={() => onVisibilityChange(group.key, !group.visible)}
            >
              {t(group.visible ? 'groupOrdering.hide' : 'groupOrdering.show')}
            </Button>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
