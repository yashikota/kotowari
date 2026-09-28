import {
  ActionIcon,
  Box,
  Button,
  Collapse,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconChevronDown, IconDiamond, IconPlus, IconTrash } from '@tabler/icons-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCalendarDate } from '../time.ts';
import { ProjectDateProperty } from './ProjectDateProperty.tsx';

type MilestoneDraft = { name: string; description: string; targetDate: string };

export type ProjectCreateMilestoneHandlers = {
  onToggleMilestones: () => void;
  onOpenMilestoneDraft: () => void;
  onCancelMilestoneDraft: () => void;
  onMilestoneDraftNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMilestoneDraftNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onMilestoneDraftDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onMilestoneDraftTargetDateChange: (value: string) => void;
  onAddInitialMilestone: () => void;
  onRemoveInitialMilestone: (index: number) => void;
};

export function ProjectCreateMilestones({
  milestones,
  expanded,
  draft,
  draftOpen,
  handlers,
}: {
  milestones: MilestoneDraft[];
  expanded: boolean;
  draft: MilestoneDraft;
  draftOpen: boolean;
  handlers: ProjectCreateMilestoneHandlers;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;

  return (
    <Stack gap="xs" aria-label={t('projectMilestones.heading')}>
      {draftOpen ? (
        <Box
          id="project-create-milestones-content"
          p="sm"
          style={{
            height: 222,
            minHeight: 222,
            marginInline: -5,
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 12,
          }}
        >
          <Stack gap="xs" h="100%">
            <Text size="sm" fw={500} c="dimmed">
              {t('projectMilestones.createMilestone')}
            </Text>
            <Group
              align="center"
              gap="xs"
              wrap="nowrap"
              mt={6}
              style={{ position: 'relative', top: 5 }}
            >
              <TextInput
                autoFocus
                required
                maxLength={120}
                aria-label={t('projectMilestones.name')}
                placeholder={t('projectMilestones.name')}
                value={draft.name}
                onChange={handlers.onMilestoneDraftNameChange}
                onKeyDown={handlers.onMilestoneDraftNameKeyDown}
                leftSection={<IconDiamond size={14} stroke={1.7} aria-hidden="true" />}
                variant="unstyled"
                size="sm"
                style={{ flex: 1 }}
                styles={{
                  input: {
                    height: 32,
                    minHeight: 32,
                    fontSize: 14,
                    fontWeight: 600,
                    paddingInline: 28,
                  },
                }}
              />
              <ProjectDateProperty
                label={t('projectMilestones.targetDate')}
                ariaLabel={t('projectMilestones.chooseDate')}
                value={draft.targetDate}
                onChange={handlers.onMilestoneDraftTargetDateChange}
                compact
                iconOnly
                variant="subtle"
                color="gray"
              />
            </Group>
            <Textarea
              aria-label={t('projectMilestones.description')}
              placeholder={t('projectMilestones.descriptionPlaceholder')}
              value={draft.description}
              onChange={handlers.onMilestoneDraftDescriptionChange}
              minRows={2}
              autosize
              variant="unstyled"
              mt={4}
              styles={{ input: { paddingInline: 28, resize: 'none' } }}
            />
            <Group justify="flex-end" gap={12} mt="auto">
              <Button
                type="button"
                variant="default"
                size="compact-sm"
                onClick={handlers.onCancelMilestoneDraft}
                styles={{ root: { height: 24, minHeight: 24, borderRadius: 999 } }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                size="compact-sm"
                disabled={!draft.name.trim()}
                onClick={handlers.onAddInitialMilestone}
                styles={{ root: { height: 24, minHeight: 24, borderRadius: 999 } }}
              >
                {t('projectMilestones.add')}
              </Button>
            </Group>
          </Stack>
        </Box>
      ) : (
        <Box
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 12,
          }}
        >
          <Group justify="space-between" mih={44} px={12}>
            <Button
              type="button"
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={
                <IconChevronDown
                  size={14}
                  stroke={1.8}
                  aria-hidden="true"
                  style={{
                    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 120ms ease',
                  }}
                />
              }
              aria-expanded={expanded}
              aria-controls="project-create-milestones-content"
              onClick={handlers.onToggleMilestones}
            >
              {t('projectMilestones.heading')}
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="compact-sm"
              aria-label={t('projectMilestones.addToProject')}
              title={t('projectMilestones.addToProject')}
              onClick={handlers.onOpenMilestoneDraft}
            >
              <IconPlus size={14} stroke={1.7} aria-hidden="true" />
            </Button>
          </Group>
          <Collapse expanded={expanded} transitionDuration={140} animateOpacity>
            <Stack id="project-create-milestones-content" gap="xs" px={12} pb={12}>
              {milestones.map((milestone, index) => (
                <Group key={`${milestone.name}-${index}`} justify="space-between" gap="xs">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500}>
                      {milestone.name}
                    </Text>
                    {milestone.description && (
                      <Text size="xs" c="dimmed">
                        {milestone.description}
                      </Text>
                    )}
                    {milestone.targetDate && (
                      <Text size="xs" c="dimmed">
                        {formatCalendarDate(milestone.targetDate, locale)}
                      </Text>
                    )}
                  </Stack>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    aria-label={t('projectMilestones.remove', { name: milestone.name })}
                    onClick={() => handlers.onRemoveInitialMilestone(index)}
                  >
                    <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Stack>
  );
}
