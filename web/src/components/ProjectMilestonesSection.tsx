import { ActionIcon, Box, Button, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectMilestone } from '../types.ts';
import { Section } from '../mantine-ui.tsx';

export function ProjectMilestonesSection({
  milestones,
  name,
  description,
  targetDate,
  onCreate,
  onDraftNameChange,
  onDraftDescriptionChange,
  onDraftTargetDateChange,
  onNameChange,
  onNameBlur,
  onTargetDateChange,
  onTargetDateBlur,
  onDescriptionBlur,
  onRemove,
}: {
  milestones: ProjectMilestone[];
  name: string;
  description: string;
  targetDate: string;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onDraftNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDraftDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDraftTargetDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (id: number, event: ChangeEvent<HTMLInputElement>) => void;
  onNameBlur: (id: number) => void;
  onTargetDateChange: (id: number, event: ChangeEvent<HTMLInputElement>) => void;
  onTargetDateBlur: (id: number) => void;
  onDescriptionBlur: (id: number, description: string) => void;
  onRemove: (id: number, name: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Section title={t('projectMilestones.heading')}>
      <Box component="form" aria-label={t('projectMilestones.heading')} onSubmit={onCreate}>
        <Group gap="xs" align="flex-end" wrap="wrap">
          <TextInput
            aria-label={t('projectMilestones.name')}
            placeholder={t('projectMilestones.namePlaceholder')}
            value={name}
            onChange={onDraftNameChange}
            size="sm"
            style={{ flex: '1 1 220px' }}
          />
          <Textarea
            aria-label={t('projectMilestones.description')}
            placeholder={t('projectMilestones.descriptionPlaceholder')}
            value={description}
            onChange={onDraftDescriptionChange}
            minRows={1}
            autosize
            size="sm"
            style={{ flex: '1 1 220px' }}
          />
          <TextInput
            type="date"
            aria-label={t('projectMilestones.targetDate')}
            value={targetDate}
            onChange={onDraftTargetDateChange}
            size="sm"
          />
          <Button type="submit" variant="default" size="sm">
            {t('projectMilestones.add')}
          </Button>
        </Group>
      </Box>
      {milestones.length === 0 ? (
        <Text size="sm" c="dimmed" mt="sm">
          {t('projectMilestones.empty')}
        </Text>
      ) : (
        <Stack
          component="ul"
          gap="xs"
          mt="sm"
          style={{
            listStyle: 'none',
            margin: 'var(--mantine-spacing-sm) 0 0',
            padding: 0,
          }}
        >
          {milestones.map((milestone) => (
            <Stack component="li" key={milestone.id} gap="xs">
              <Group gap="xs" wrap="wrap">
                <TextInput
                  aria-label={`${t('projectMilestones.name')}: ${milestone.name}`}
                  value={milestone.name}
                  onChange={(event) => onNameChange(milestone.id, event)}
                  onBlur={() => onNameBlur(milestone.id)}
                  size="sm"
                  style={{ flex: '1 1 220px' }}
                />
                <TextInput
                  type="date"
                  aria-label={`${t('projectMilestones.targetDate')}: ${milestone.name}`}
                  value={milestone.targetDate?.slice(0, 10) ?? ''}
                  onChange={(event) => onTargetDateChange(milestone.id, event)}
                  onBlur={() => onTargetDateBlur(milestone.id)}
                  size="sm"
                />
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="red"
                  aria-label={t('projectMilestones.remove', { name: milestone.name })}
                  onClick={() => onRemove(milestone.id, milestone.name)}
                >
                  <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
              </Group>
              <Textarea
                aria-label={`${t('projectMilestones.description')}: ${milestone.name}`}
                placeholder={t('projectMilestones.descriptionPlaceholder')}
                defaultValue={milestone.description ?? ''}
                onBlur={(event) => onDescriptionBlur(milestone.id, event.currentTarget.value)}
                minRows={1}
                autosize
                size="sm"
              />
            </Stack>
          ))}
        </Stack>
      )}
    </Section>
  );
}
