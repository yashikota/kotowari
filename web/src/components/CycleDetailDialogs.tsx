import { Box, Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';

export function CycleDetailDialogs({
  cycleStatus,
  metadataOpen,
  datesOpen,
  resourceLinkOpen,
  nameDraft,
  descriptionDraft,
  startDateDraft,
  endDateDraft,
  datesValid,
  resourceURL,
  resourceTitle,
  resourceError,
  onCloseMetadata,
  onSaveMetadata,
  onNameChange,
  onDescriptionChange,
  onCloseDates,
  onSaveDates,
  onStartDateChange,
  onEndDateChange,
  onCloseResourceLink,
  onAddResourceLink,
  onResourceURLChange,
  onResourceTitleChange,
}: {
  cycleStatus: Cycle['status'];
  metadataOpen: boolean;
  datesOpen: boolean;
  resourceLinkOpen: boolean;
  nameDraft: string;
  descriptionDraft: string;
  startDateDraft: string;
  endDateDraft: string;
  datesValid: boolean;
  resourceURL: string;
  resourceTitle: string;
  resourceError: string;
  onCloseMetadata: () => void;
  onSaveMetadata: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onCloseDates: () => void;
  onSaveDates: (event: FormEvent<HTMLFormElement>) => void;
  onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCloseResourceLink: () => void;
  onAddResourceLink: (event: FormEvent<HTMLFormElement>) => void;
  onResourceURLChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResourceTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        opened={metadataOpen}
        onClose={onCloseMetadata}
        title={t('cycle.editNameAndDescription')}
        centered
      >
        <Box component="form" onSubmit={onSaveMetadata}>
          <Stack>
            <TextInput
              required
              maxLength={120}
              label={t('cycle.name')}
              value={nameDraft}
              onChange={onNameChange}
            />
            <Textarea
              label={t('cycle.description')}
              value={descriptionDraft}
              onChange={onDescriptionChange}
              minRows={3}
              autosize
            />
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={onCloseMetadata}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!nameDraft.trim()}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>
      <Modal opened={datesOpen} onClose={onCloseDates} title={t('cycle.changeDates')} centered>
        <Box component="form" onSubmit={onSaveDates}>
          <Stack>
            <TextInput
              type="date"
              label={t('cycle.startDate')}
              value={startDateDraft}
              disabled={cycleStatus === 'active'}
              onChange={onStartDateChange}
            />
            {cycleStatus === 'active' ? (
              <Text size="xs" c="dimmed">
                {t('cycle.activeStartDateHint')}
              </Text>
            ) : null}
            <TextInput
              type="date"
              label={t('cycle.endDate')}
              value={endDateDraft}
              onChange={onEndDateChange}
            />
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={onCloseDates}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!datesValid}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>
      <Modal
        opened={resourceLinkOpen}
        onClose={onCloseResourceLink}
        title={t('cycle.addLinkTitle')}
        centered
      >
        <Box component="form" onSubmit={onAddResourceLink}>
          <Stack>
            <TextInput
              type="url"
              required
              label={t('cycle.url')}
              placeholder={t('ui.urlPlaceholder')}
              value={resourceURL}
              onChange={onResourceURLChange}
            />
            <TextInput
              label={t('cycle.linkTitle')}
              value={resourceTitle}
              onChange={onResourceTitleChange}
            />
            {resourceError ? (
              <Text size="sm" c="var(--mantine-color-error)" role="alert">
                {resourceError}
              </Text>
            ) : null}
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={onCloseResourceLink}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('cycle.saveLink')}</Button>
            </Group>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
