import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { CycleListItem } from '../components/CycleListItem.tsx';

import { CycleOverview } from '../components/CycleOverview.tsx';
import timelineStyles from '../components/CyclesTimeline.module.css';

import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';

import { useCyclesPagePresenter } from '../presenters/Cycles.tsx';

export function CyclesPageView({ model }: { model: ReturnType<typeof useCyclesPagePresenter> }) {
  const { t, i18n } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        cycles,
        scope,
        currentCycleOverview,
        metadataCycle,
        datesCycle,
        nameDraft,
        descriptionDraft,
        startDateDraft,
        endDateDraft,
        datesValid,
        handlers,
      } = model;
      return (
        <SplitLayout single>
          <Pane single flush>
            <PageHeader
              title={t('nav.cycles')}
              minHeight={44}
              titleSize="md"
              paddingX={19}
              actions={
                <Group gap="xs">
                  <Button
                    type="button"
                    size="xs"
                    variant="subtle"
                    onClick={handlers.onToggleArchivedCycles}
                  >
                    {t(scope === 'archived' ? 'cycle.showActive' : 'cycle.showArchived')}
                  </Button>
                  {scope !== 'archived' ? (
                    <ActionIcon
                      type="button"
                      variant="default"
                      aria-label={t('cycle.newCycle')}
                      title={t('cycle.newCycle')}
                      onClick={handlers.onClick0}
                    >
                      <IconPlus size={16} stroke={1.7} aria-hidden="true" />
                    </ActionIcon>
                  ) : null}
                </Group>
              }
            />
            {cycles.length === 0 ? (
              <EmptyState>{t('cycle.emptyState')}</EmptyState>
            ) : (
              <Box className={timelineStyles.timeline}>
                <Stack gap={0} px="md" pb="xl">
                  {cycles.map((cycle) => (
                    <Box key={cycle.number}>
                      <CycleListItem cycle={cycle} />
                      {currentCycleOverview?.cycle.number === cycle.number ? (
                        <CycleOverview
                          {...currentCycleOverview}
                          locale={i18n.resolvedLanguage || i18n.language}
                        />
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
            <Modal
              opened={metadataCycle !== null}
              onClose={handlers.onCloseMetadata}
              title={t('cycle.editNameAndDescription')}
              centered
            >
              <Box component="form" onSubmit={handlers.onSaveMetadata}>
                <Stack>
                  <TextInput
                    required
                    maxLength={120}
                    label={t('cycle.name')}
                    value={nameDraft}
                    onChange={handlers.onNameChange}
                  />
                  <Textarea
                    label={t('cycle.description')}
                    value={descriptionDraft}
                    onChange={handlers.onDescriptionChange}
                    minRows={3}
                    autosize
                  />
                  <Group justify="flex-end">
                    <Button type="button" variant="default" onClick={handlers.onCloseMetadata}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={!nameDraft.trim()}>
                      {t('common.save')}
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Modal>
            <Modal
              opened={datesCycle !== null}
              onClose={handlers.onCloseDates}
              title={t('cycle.changeDates')}
              centered
            >
              <Box component="form" onSubmit={handlers.onSaveDates}>
                <Stack>
                  <TextInput
                    type="date"
                    label={t('cycle.startDate')}
                    value={startDateDraft}
                    disabled={datesCycle?.status === 'active'}
                    onChange={handlers.onStartDateChange}
                  />
                  {datesCycle?.status === 'active' ? (
                    <Text size="xs" c="dimmed">
                      {t('cycle.activeStartDateHint')}
                    </Text>
                  ) : null}
                  <TextInput
                    type="date"
                    label={t('cycle.endDate')}
                    value={endDateDraft}
                    onChange={handlers.onEndDateChange}
                  />
                  <Group justify="flex-end">
                    <Button type="button" variant="default" onClick={handlers.onCloseDates}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={!datesValid}>
                      {t('common.save')}
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Modal>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function CyclesPage() {
  return (
    <PresenterScope name="CyclesPage">
      <CyclesPageBinding />
    </PresenterScope>
  );
}

function CyclesPageBinding() {
  const model = useCyclesPagePresenter();
  const handlers = useActions(model.handlers);
  return <CyclesPageView model={{ ...model, handlers } as typeof model} />;
}
