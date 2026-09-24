import {
  ActionIcon,
  Button,
  Group,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconMoodSmile } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export const REACTION_CHOICES = [
  { key: 'thumbsUp', emoji: '👍' },
  { key: 'thumbsDown', emoji: '👎' },
  { key: 'heart', emoji: '❤️' },
  { key: 'laugh', emoji: '😂' },
  { key: 'party', emoji: '🎉' },
  { key: 'fire', emoji: '🔥' },
  { key: 'eyes', emoji: '👀' },
  { key: 'rocket', emoji: '🚀' },
  { key: 'check', emoji: '✅' },
  { key: 'raisedHands', emoji: '🙌' },
  { key: 'hundred', emoji: '💯' },
  { key: 'smile', emoji: '😄' },
  { key: 'surprised', emoji: '😮' },
  { key: 'sad', emoji: '😢' },
  { key: 'angry', emoji: '😡' },
  { key: 'thinking', emoji: '🤔' },
  { key: 'clap', emoji: '👏' },
  { key: 'pray', emoji: '🙏' },
  { key: 'idea', emoji: '💡' },
  { key: 'bug', emoji: '🐛' },
  { key: 'sparkles', emoji: '✨' },
  { key: 'handshake', emoji: '🤝' },
  { key: 'celebrate', emoji: '🥳' },
  { key: 'starStruck', emoji: '🤩' },
  { key: 'confused', emoji: '😕' },
  { key: 'muscle', emoji: '💪' },
  { key: 'coffee', emoji: '☕' },
  { key: 'seedling', emoji: '🌱' },
  { key: 'target', emoji: '🎯' },
  { key: 'salute', emoji: '🫡' },
] as const;

type ReactionChoice = (typeof REACTION_CHOICES)[number];

function reactionName(emoji: string, t: (key: string) => string) {
  const choice = REACTION_CHOICES.find((item) => item.emoji === emoji);
  return choice ? t(`reactions.emojiNames.${choice.key}`) : emoji;
}

export function ReactionPicker({
  target,
  openedTarget,
  query,
  onOpenChange,
  onQueryChange,
  onSelect,
}: {
  target: string;
  openedTarget: string | null;
  query: string;
  onOpenChange: (target: string, opened: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (target: string, emoji: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.language);
  const choices = REACTION_CHOICES.filter((choice) => {
    const name = t(`reactions.emojiNames.${choice.key}`);
    return `${choice.emoji} ${name} ${choice.key}`
      .toLocaleLowerCase(i18n.language)
      .includes(normalizedQuery);
  });

  return (
    <Popover
      opened={openedTarget === target}
      onChange={(opened) => onOpenChange(target, opened)}
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
          onClick={() => onOpenChange(target, openedTarget !== target)}
        >
          <IconMoodSmile size={16} aria-hidden="true" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p="sm" w={292}>
        <Stack gap="xs">
          <TextInput
            size="xs"
            aria-label={t('reactions.search')}
            placeholder={t('reactions.search')}
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
          />
          {choices.length ? (
            <SimpleGrid cols={6} spacing={4}>
              {choices.map((choice) => (
                <ActionIcon
                  key={choice.key}
                  type="button"
                  variant="subtle"
                  size="lg"
                  aria-label={t(`reactions.emojiNames.${choice.key}`)}
                  onClick={() => onSelect(target, choice.emoji)}
                  style={{ fontSize: 20 }}
                >
                  {choice.emoji}
                </ActionIcon>
              ))}
            </SimpleGrid>
          ) : (
            <Text c="dimmed" size="xs" ta="center" py="xs">
              {t('reactions.noMatches')}
            </Text>
          )}
        </Stack>
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

export function reactionChoiceFor(emoji: string): ReactionChoice | undefined {
  return REACTION_CHOICES.find((choice) => choice.emoji === emoji);
}
