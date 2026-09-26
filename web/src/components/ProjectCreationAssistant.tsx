import { Box, Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Panel } from './AIPanel.tsx';

export function ProjectCreationAssistant({ id, onHide }: { id: string; onHide: () => void }) {
  const { t } = useTranslation();

  return (
    <Box
      component="aside"
      aria-label={t('projectAssistant.title')}
      style={{
        flex: '0 0 44%',
        minWidth: 0,
        minHeight: 0,
        borderLeft: '1px solid var(--mantine-color-default-border)',
        overflow: 'hidden',
      }}
    >
      <Stack h="100%" gap="sm" p="md">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Stack gap={4}>
            <Text component="h3" size="sm" fw={600}>
              {t('projectAssistant.heading')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('projectAssistant.description')}
            </Text>
          </Stack>
          <Button type="button" variant="subtle" size="compact-sm" onClick={onHide}>
            {t('projectAssistant.hide')}
          </Button>
        </Group>
        <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Panel
            kind="agent"
            id={id}
            standalone
            hidePromptLabel
            promptPlaceholder={t('projectAssistant.promptPlaceholder')}
            starterPrompts={[
              {
                label: t('projectAssistant.outlineScope'),
                prompt: t('projectAssistant.prompt.outlineScope'),
              },
              {
                label: t('projectAssistant.research'),
                prompt: t('projectAssistant.prompt.research'),
              },
              {
                label: t('projectAssistant.planTimeline'),
                prompt: t('projectAssistant.prompt.planTimeline'),
              },
              {
                label: t('projectAssistant.suggestMilestones'),
                prompt: t('projectAssistant.prompt.suggestMilestones'),
              },
            ]}
          />
        </Box>
      </Stack>
    </Box>
  );
}
