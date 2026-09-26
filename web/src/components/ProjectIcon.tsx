import {
  ActionIcon,
  Box,
  ColorInput,
  Group,
  Popover,
  SimpleGrid,
  Stack,
  Tabs,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconBolt,
  IconBook,
  IconBriefcase,
  IconBug,
  IconBuilding,
  IconCalendar,
  IconChartBar,
  IconCode,
  IconCoffee,
  IconCompass,
  IconCpu,
  IconDatabase,
  IconDeviceDesktop,
  IconDiamond,
  IconFlame,
  IconFlask,
  IconFolder,
  IconHeart,
  IconHome,
  IconLeaf,
  IconLock,
  IconMap,
  IconMessage,
  IconMoon,
  IconPalette,
  IconPuzzle,
  IconRocket,
  IconShield,
  IconSparkles,
  IconStar,
  IconSun,
  IconTarget,
  IconTerminal,
  IconTools,
  IconTrophy,
  IconWorld,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PROJECT_ICONS = [
  { key: 'folder', Icon: IconFolder },
  { key: 'rocket', Icon: IconRocket },
  { key: 'bolt', Icon: IconBolt },
  { key: 'book', Icon: IconBook },
  { key: 'bug', Icon: IconBug },
  { key: 'briefcase', Icon: IconBriefcase },
  { key: 'building', Icon: IconBuilding },
  { key: 'calendar', Icon: IconCalendar },
  { key: 'chart-bar', Icon: IconChartBar },
  { key: 'code', Icon: IconCode },
  { key: 'coffee', Icon: IconCoffee },
  { key: 'compass', Icon: IconCompass },
  { key: 'cpu', Icon: IconCpu },
  { key: 'database', Icon: IconDatabase },
  { key: 'desktop', Icon: IconDeviceDesktop },
  { key: 'diamond', Icon: IconDiamond },
  { key: 'flame', Icon: IconFlame },
  { key: 'flask', Icon: IconFlask },
  { key: 'heart', Icon: IconHeart },
  { key: 'home', Icon: IconHome },
  { key: 'leaf', Icon: IconLeaf },
  { key: 'lock', Icon: IconLock },
  { key: 'map', Icon: IconMap },
  { key: 'message', Icon: IconMessage },
  { key: 'moon', Icon: IconMoon },
  { key: 'palette', Icon: IconPalette },
  { key: 'puzzle', Icon: IconPuzzle },
  { key: 'shield', Icon: IconShield },
  { key: 'sparkles', Icon: IconSparkles },
  { key: 'star', Icon: IconStar },
  { key: 'sun', Icon: IconSun },
  { key: 'target', Icon: IconTarget },
  { key: 'terminal', Icon: IconTerminal },
  { key: 'tools', Icon: IconTools },
  { key: 'trophy', Icon: IconTrophy },
  { key: 'world', Icon: IconWorld },
] as const;

const PROJECT_EMOJIS = [
  { key: 'rocket', char: '🚀' },
  { key: 'star', char: '⭐' },
  { key: 'sparkles', char: '✨' },
  { key: 'fire', char: '🔥' },
  { key: 'lightning', char: '⚡' },
  { key: 'bug', char: '🐛' },
  { key: 'books', char: '📚' },
  { key: 'bulb', char: '💡' },
  { key: 'heart', char: '❤️' },
  { key: 'leaf', char: '🍃' },
  { key: 'globe', char: '🌐' },
  { key: 'moon', char: '🌙' },
  { key: 'sun', char: '☀️' },
  { key: 'rainbow', char: '🌈' },
  { key: 'gem', char: '💎' },
  { key: 'coffee', char: '☕' },
  { key: 'computer', char: '💻' },
  { key: 'paint', char: '🎨' },
  { key: 'target', char: '🎯' },
  { key: 'construction', char: '🚧' },
  { key: 'package', char: '📦' },
  { key: 'seedling', char: '🌱' },
  { key: 'wave', char: '🌊' },
  { key: 'mountain', char: '⛰️' },
  { key: 'music', char: '🎵' },
  { key: 'camera', char: '📷' },
  { key: 'airplane', char: '✈️' },
] as const;

const PROJECT_ICON_COLORS = [
  { key: 'grey', css: 'gray' },
  { key: 'blue', css: 'blue' },
  { key: 'purple', css: 'grape' },
  { key: 'pink', css: 'pink' },
  { key: 'red', css: 'red' },
  { key: 'orange', css: 'orange' },
  { key: 'yellow', css: 'yellow' },
  { key: 'green', css: 'green' },
] as const;

function iconColorStyle(color?: string) {
  const palette = PROJECT_ICON_COLORS.find((item) => item.key === color);
  if (palette) return `var(--mantine-color-${palette.css}-6)`;
  return color && /^#[\da-f]{6}$/i.test(color) ? color : 'var(--mantine-color-gray-6)';
}

export function ProjectIconMark({
  icon,
  color,
  size = 20,
}: {
  icon?: string;
  color?: string;
  size?: number;
}) {
  if (icon?.startsWith('emoji:')) {
    const emoji = PROJECT_EMOJIS.find((item) => `emoji:${item.key}` === icon);
    return (
      <Box component="span" aria-hidden style={{ fontSize: size, lineHeight: 1 }}>
        {emoji?.char ?? '📁'}
      </Box>
    );
  }
  const entry = PROJECT_ICONS.find((item) => item.key === icon) ?? PROJECT_ICONS[0];
  const Icon = entry.Icon;
  return <Icon aria-hidden size={size} stroke={1.8} color={iconColorStyle(color)} />;
}

export function ProjectIconPicker({
  icon,
  color,
  onChange,
  onColorChange,
  size = 38,
}: {
  icon?: string;
  color?: string;
  onChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  size?: number;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [tab, setTab] = useState<string | null>('icons');
  const [query, setQuery] = useState('');
  const [customColor, setCustomColor] = useState(color?.startsWith('#') ? color : '#5c7cfa');
  useEffect(() => {
    setCustomColor(color?.startsWith('#') ? color : '#5c7cfa');
  }, [color]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredIcons = useMemo(
    () =>
      PROJECT_ICONS.filter((item) =>
        t(`projectIcons.names.${item.key}`).toLocaleLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery, t],
  );
  const filteredEmojis = PROJECT_EMOJIS.filter((item) =>
    t(`projectIcons.emojiNames.${item.key}`).toLocaleLowerCase().includes(normalizedQuery),
  );

  function chooseIcon(value: string) {
    onChange(value);
    setOpened(false);
    setQuery('');
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      withinPortal={false}
      shadow="md"
      width={312}
      zIndex={400}
    >
      <Popover.Target>
        <ActionIcon
          type="button"
          variant="default"
          size={size}
          aria-label={t('projectIcons.choose')}
          onClick={() => setOpened((current) => !current)}
        >
          <ProjectIconMark icon={icon} color={color} size={20} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Stack gap="sm">
          <Tabs value={tab} onChange={setTab} keepMounted={false}>
            <Tabs.List grow>
              <Tabs.Tab value="icons">{t('projectIcons.iconsTab')}</Tabs.Tab>
              <Tabs.Tab value="emojis">{t('projectIcons.emojisTab')}</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="icons" pt="sm">
              <Stack gap="sm">
                <Group gap={6} justify="space-between" aria-label={t('projectIcons.colorsLabel')}>
                  {PROJECT_ICON_COLORS.map((item) => (
                    <Tooltip key={item.key} label={t(`projectIcons.colors.${item.key}`)}>
                      <ActionIcon
                        type="button"
                        variant={color === item.key ? 'light' : 'subtle'}
                        aria-label={t('projectIcons.chooseColor', {
                          color: t(`projectIcons.colors.${item.key}`),
                        })}
                        aria-pressed={color === item.key}
                        onClick={() => onColorChange(item.key)}
                      >
                        <Box
                          component="span"
                          w={14}
                          h={14}
                          style={{
                            borderRadius: '50%',
                            backgroundColor: iconColorStyle(item.key),
                          }}
                        />
                      </ActionIcon>
                    </Tooltip>
                  ))}
                </Group>
                <ColorInput
                  size="xs"
                  aria-label={t('projectIcons.customColor')}
                  placeholder={t('projectIcons.customColor')}
                  format="hex"
                  value={customColor}
                  onChange={setCustomColor}
                  onChangeEnd={onColorChange}
                  disallowInput
                  withPicker
                />
                <TextInput
                  size="xs"
                  aria-label={t('projectIcons.search')}
                  placeholder={t('projectIcons.search')}
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                />
                <SimpleGrid cols={7} spacing={4} verticalSpacing={4}>
                  {filteredIcons.map(({ key, Icon }) => (
                    <Tooltip key={key} label={t(`projectIcons.names.${key}`)}>
                      <ActionIcon
                        type="button"
                        variant={icon === key ? 'light' : 'subtle'}
                        aria-label={t(`projectIcons.names.${key}`)}
                        aria-pressed={icon === key}
                        onClick={() => chooseIcon(key)}
                      >
                        <Icon size={18} stroke={1.8} />
                      </ActionIcon>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="emojis" pt="sm">
              <Stack gap="sm">
                <TextInput
                  size="xs"
                  aria-label={t('projectIcons.search')}
                  placeholder={t('projectIcons.search')}
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                />
                <SimpleGrid cols={7} spacing={4} verticalSpacing={4}>
                  {filteredEmojis.map((item) => (
                    <Tooltip key={item.key} label={t(`projectIcons.emojiNames.${item.key}`)}>
                      <ActionIcon
                        type="button"
                        variant={icon === `emoji:${item.key}` ? 'light' : 'subtle'}
                        aria-label={t(`projectIcons.emojiNames.${item.key}`)}
                        aria-pressed={icon === `emoji:${item.key}`}
                        onClick={() => chooseIcon(`emoji:${item.key}`)}
                        styles={{ root: { fontSize: 19 } }}
                      >
                        {item.char}
                      </ActionIcon>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
