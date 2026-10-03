import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { useActionFocusReturn } from '../focus.ts';
import { useRef } from 'react';
import {
  Box,
  Button,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconCheck, IconChevronDown, IconTag } from '@tabler/icons-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Label } from '../types.ts';
import styles from './IssuePropertiesPanel.module.css';
import { IssuePropertyRow } from './IssuePropertyControls.tsx';

export function IssueLabelsProperty({
  saving,
  saved,
  error,
  onRetry,
  labels,
  selectedLabelIds,
  labelName,
  opened,
  onOpenChange,
  onToggleOpen,
  onLabelQueryChange,
  onLabelQueryKeyDown,
  onToggleLabel,
  onCreateLabel,
}: {
  saving: boolean;
  saved: boolean;
  error: string;
  onRetry: () => unknown;
  labels: Label[];
  selectedLabelIds: Set<number>;
  labelName: string;
  opened: boolean;
  onOpenChange: (opened: boolean) => void;
  onToggleOpen: () => void;
  onLabelQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLabelQueryKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggleLabel: (label: Label) => void;
  onCreateLabel: () => void;
}) {
  const { t } = useTranslation();
  const target = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const run = useActionFocusReturn(
    saving,
    () =>
      popup.current?.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)') ??
      popup.current?.querySelector<HTMLInputElement>('input:not(:disabled)') ??
      target.current,
  );
  const selectedLabels = labels.filter((label) => selectedLabelIds.has(label.id));
  const labelQuery = labelName.trim().toLocaleLowerCase();
  const visibleLabels = labels.filter((label) =>
    label.name.toLocaleLowerCase().includes(labelQuery),
  );
  const canCreateLabel =
    labelQuery.length > 0 &&
    !labels.some((label) => label.name.trim().toLocaleLowerCase() === labelQuery);

  const feedback = (
    <SaveFeedback
      saving={saving}
      saved={saved}
      error={error}
      savingLabel={t('issueProperties.savingLabels')}
      savedLabel={t('issueProperties.labelsSaved')}
      failureLabel={t('issueProperties.labelsFailed')}
      retryLabel={t('issueProperties.retryLabels')}
      onRetry={() => run(onRetry)}
    />
  );
  return (
    <Box
      role="group"
      aria-label={t('issueProperties.labels')}
      className={`${styles.section} ${styles.labelsSection}`}
    >
      <Text component="h3" className={styles.heading}>
        {t('issueProperties.labels')}
      </Text>
      {!opened ? feedback : null}
      <IssuePropertyRow
        label={t('issueProperties.labels')}
        icon={<IconTag size={14} stroke={1.7} />}
        className={styles.labelsRow}
      >
        <Popover
          position="bottom-start"
          preventPositionChangeWhenVisible={false}
          middlewares={{
            flip: { padding: 12 },
            shift: { crossAxis: true, padding: 12 },
            size: true,
          }}
          shadow="md"
          width={264}
          withinPortal
          opened={opened}
          onChange={onOpenChange}
        >
          <Popover.Target>
            <UnstyledButton
              ref={target}
              type="button"
              aria-label={t('issueProperties.changeLabels')}
              aria-expanded={opened}
              className={styles.labelPickerTarget}
              onClick={onToggleOpen}
            >
              <Group gap={4} wrap="wrap" className={styles.selectedLabels}>
                {selectedLabels.length > 0 ? (
                  selectedLabels.map((label) => (
                    <span
                      key={label.id}
                      className={styles.labelPill}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${label.color} 18%, transparent)`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))
                ) : (
                  <Text size="xs" c="dimmed" truncate>
                    {t('issueProperties.addLabel')}
                  </Text>
                )}
              </Group>
              {selectedLabels.length > 0 ? (
                <IconChevronDown size={13} stroke={1.8} aria-hidden="true" />
              ) : null}
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown
            ref={popup}
            role="dialog"
            aria-label={t('issueProperties.changeLabels')}
            className={styles.labelPicker}
          >
            {feedback}
            <TextInput
              aria-label={t('issueProperties.changeLabels')}
              placeholder={t('issueProperties.findOrCreateLabel')}
              autoFocus={opened}
              disabled={saving}
              maxLength={100}
              value={labelName}
              onChange={onLabelQueryChange}
              onKeyDown={onLabelQueryKeyDown}
              size="xs"
              mb="xs"
            />
            <ScrollArea.Autosize mah={196} type="auto">
              <Stack gap={2}>
                {visibleLabels.map((label) => {
                  const selected = selectedLabelIds.has(label.id);
                  return (
                    <UnstyledButton
                      key={label.id}
                      type="button"
                      role="checkbox"
                      aria-label={label.name}
                      aria-checked={selected}
                      disabled={saving}
                      onClick={() => run(() => onToggleLabel(label))}
                      className={styles.labelOption}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Box
                          w={8}
                          h={8}
                          style={{
                            flex: '0 0 auto',
                            borderRadius: '50%',
                            backgroundColor: label.color,
                          }}
                        />
                        <Text size="sm" style={{ overflowWrap: 'anywhere', minWidth: 0 }}>
                          {label.name}
                        </Text>
                        {selected ? <IconCheck size={14} className={styles.check} /> : null}
                      </Group>
                    </UnstyledButton>
                  );
                })}
                {visibleLabels.length === 0 ? (
                  <Text size="xs" c="dimmed" p="xs">
                    {t('issueProperties.noLabelsFound')}
                  </Text>
                ) : null}
              </Stack>
            </ScrollArea.Autosize>
            {canCreateLabel ? (
              <Button
                type="button"
                variant="subtle"
                size="compact-xs"
                fullWidth
                mt="xs"
                disabled={saving}
                className={styles.labelCreate}
                onClick={() => run(onCreateLabel)}
              >
                {t('issueProperties.createLabel', { name: labelName.trim() })}
              </Button>
            ) : null}
          </Popover.Dropdown>
        </Popover>
      </IssuePropertyRow>
    </Box>
  );
}
