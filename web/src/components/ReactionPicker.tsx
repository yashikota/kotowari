import 'emoji-picker-element';
import enPickerI18n from 'emoji-picker-element/i18n/en';
import jaPickerI18n from 'emoji-picker-element/i18n/ja';
import type PickerElement from 'emoji-picker-element/picker';
import type { EmojiClickEvent, I18n } from 'emoji-picker-element/shared';
import enEmojiDataUrl from 'emoji-picker-element-data/en/emojibase/data.json?url';
import jaEmojiDataUrl from 'emoji-picker-element-data/ja/emojibase/data.json?url';
import { ActionIcon, Button, Group, Popover, Text, useComputedColorScheme } from '@mantine/core';
import { IconMoodSmile } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reactionEmojiFromPickerDetail } from '../emoji-reactions.ts';

const REACTION_NAME_KEYS: Readonly<Record<string, string>> = {
  '👍': 'thumbsUp',
  '👎': 'thumbsDown',
  '❤': 'heart',
  '❤️': 'heart',
  '😂': 'laugh',
  '🎉': 'party',
  '🔥': 'fire',
  '👀': 'eyes',
  '🚀': 'rocket',
  '✅': 'check',
  '🙌': 'raisedHands',
  '💯': 'hundred',
  '😄': 'smile',
  '😮': 'surprised',
  '😢': 'sad',
  '😡': 'angry',
  '🤔': 'thinking',
  '👏': 'clap',
  '🙏': 'pray',
  '💡': 'idea',
  '🐛': 'bug',
  '✨': 'sparkles',
  '🤝': 'handshake',
  '🥳': 'celebrate',
  '🤩': 'starStruck',
  '😕': 'confused',
  '💪': 'muscle',
  '☕': 'coffee',
  '🌱': 'seedling',
  '🎯': 'target',
  '🫡': 'salute',
};

const PICKER_STYLE: Readonly<Record<string, string>> = {
  '--background': 'var(--mantine-color-body)',
  '--border-color': 'var(--mantine-color-default-border)',
  '--border-size': '0px',
  '--border-radius': 'var(--mantine-radius-md)',
  '--button-hover-background': 'var(--mantine-color-default-hover)',
  '--button-active-background': 'var(--mantine-primary-color-light)',
  '--category-font-color': 'var(--mantine-color-dimmed)',
  '--category-font-size': 'var(--mantine-font-size-xs)',
  '--emoji-font-family': 'var(--mantine-font-family)',
  '--emoji-size': '22px',
  '--emoji-padding': '4px',
  '--indicator-color': 'var(--mantine-primary-color-filled)',
  '--input-border-color': 'var(--mantine-color-default-border)',
  '--input-border-radius': 'var(--mantine-radius-sm)',
  '--input-border-size': '1px',
  '--input-font-color': 'var(--mantine-color-text)',
  '--input-font-size': 'var(--mantine-font-size-sm)',
  '--input-padding': '6px',
  '--num-columns': '8',
};

function reactionName(emoji: string, t: (key: string) => string) {
  const key = REACTION_NAME_KEYS[emoji] ?? REACTION_NAME_KEYS[emoji.replaceAll('\ufe0f', '')];
  return key ? t(`reactions.emojiNames.${key}`) : emoji;
}

export function ReactionPicker({
  target,
  openedTarget,
  onOpenChange,
  onSelect,
}: {
  target: string;
  openedTarget: string | null;
  onOpenChange: (target: string, opened: boolean) => void;
  onSelect: (target: string, emoji: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const colorScheme = useComputedColorScheme('light');
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith('ja') ? 'ja' : 'en';
  const dataSource = locale === 'ja' ? jaEmojiDataUrl : enEmojiDataUrl;
  const basePickerI18n = locale === 'ja' ? jaPickerI18n : enPickerI18n;
  const pickerI18n = useMemo<I18n>(
    () => ({
      ...basePickerI18n,
      regionLabel: t('reactions.picker'),
      searchLabel: t('reactions.search'),
    }),
    [basePickerI18n, t],
  );
  const opened = openedTarget === target;
  const [pickerHost, setPickerHost] = useState<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!opened || !pickerHost) return;

    const picker = document.createElement('emoji-picker') as PickerElement;
    picker.locale = locale;
    picker.dataSource = dataSource;
    picker.i18n = pickerI18n;
    picker.classList.add(colorScheme);
    picker.style.width = '328px';
    picker.style.height = '364px';
    for (const [property, value] of Object.entries(PICKER_STYLE)) {
      picker.style.setProperty(property, value);
    }
    const handleEmojiClick = (event: EmojiClickEvent) => {
      const emoji = reactionEmojiFromPickerDetail(event.detail);
      if (emoji) onSelectRef.current(target, emoji);
    };
    picker.addEventListener('emoji-click', handleEmojiClick);
    pickerHost.replaceChildren(picker);

    return () => {
      picker.removeEventListener('emoji-click', handleEmojiClick);
      picker.remove();
    };
  }, [colorScheme, dataSource, locale, opened, pickerHost, pickerI18n, target]);

  return (
    <Popover
      opened={opened}
      onChange={(nextOpened) => onOpenChange(target, nextOpened)}
      position="bottom-start"
      withinPortal
      shadow="md"
    >
      <Popover.Target>
        <ActionIcon
          type="button"
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={t('reactions.add')}
          onClick={() => onOpenChange(target, !opened)}
        >
          <IconMoodSmile size={16} aria-hidden="true" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p={4} w={336}>
        <div ref={setPickerHost} />
      </Popover.Dropdown>
    </Popover>
  );
}

export function ReactionSummary({
  reactions,
  onToggle,
}: {
  reactions: string[];
  onToggle: (emoji: string) => void;
}) {
  const { t } = useTranslation();
  if (reactions.length === 0) return null;
  return (
    <Group gap={4} wrap="wrap" aria-label={t('reactions.list')}>
      {reactions.map((emoji) => (
        <Button
          key={emoji}
          type="button"
          variant="light"
          size="compact-xs"
          px={6}
          aria-label={t('reactions.remove', { name: reactionName(emoji, t) })}
          aria-pressed="true"
          onClick={() => onToggle(emoji)}
        >
          <Group gap={4} wrap="nowrap">
            <span aria-hidden="true">{emoji}</span>
            <Text span size="xs">
              1
            </Text>
          </Group>
        </Button>
      ))}
    </Group>
  );
}
