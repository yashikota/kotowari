import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Pagination,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { IconFileImport } from '@tabler/icons-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Cycle, Label, Project } from '../types.ts';
import { useIssueCSVImportPresenter } from '../presenters/useIssueCSVImportPresenter.ts';

export function IssueCSVImportModal({
  opened,
  onClose,
  projects,
  cycles,
  labels,
}: {
  opened: boolean;
  onClose: () => void;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
}) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    fileName,
    rows,
    error,
    busy,
    reading,
    previewPage,
    progress,
    result,
    importableRows,
    skippedRows,
    warningCount,
    handlers,
  } = useIssueCSVImportPresenter({ onClose, projects, cycles, labels });
  return (
    <Modal
      opened={opened}
      onClose={handlers.close}
      title={t('issueImport.title')}
      size="lg"
      aria-label={t('issueImport.title')}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('issueImport.description')}
        </Text>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          aria-label={t('issueImport.chooseFile')}
          onChange={(event) => {
            void handlers.chooseFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <Group>
          <Button
            type="button"
            variant="default"
            leftSection={<IconFileImport size={16} aria-hidden="true" />}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {t('issueImport.chooseFile')}
          </Button>
          {fileName ? <Text size="sm">{fileName}</Text> : null}
        </Group>

        {error ? (
          <Alert color="red" variant="light" role="alert">
            {error}
          </Alert>
        ) : null}

        {rows.length > 0 ? (
          <>
            <Group gap="xs">
              <Badge color="blue">
                {t('issueImport.readyCount', { count: importableRows.length })}
              </Badge>
              {skippedRows > 0 ? (
                <Badge color="red">{t('issueImport.skippedCount', { count: skippedRows })}</Badge>
              ) : null}
              {warningCount > 0 ? (
                <Badge color="yellow">
                  {t('issueImport.warningCount', { count: warningCount })}
                </Badge>
              ) : null}
            </Group>
            <Text size="xs" c="dimmed">
              {t('issueImport.existingItemsHint')}
            </Text>
            <ScrollArea h={220} type="auto" offsetScrollbars>
              <Stack gap="xs" pr="sm">
                {rows.slice((previewPage - 1) * 20, previewPage * 20).map((row) => (
                  <Stack
                    key={row.rowNumber}
                    gap={2}
                    p="xs"
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 'var(--mantine-radius-sm)',
                    }}
                  >
                    <Text size="sm" fw={500}>
                      {row.rowNumber}. {row.title || t('issueImport.missingTitle')}
                    </Text>
                    {row.error ? (
                      <Text size="xs" c="var(--mantine-color-error)">
                        {t(`issueImport.error.${row.error}`)}
                      </Text>
                    ) : null}
                    {row.warnings.map((warning, index) => (
                      <Text key={`${warning.field}:${index}`} size="xs" c="yellow">
                        {t(`issueImport.warning.${warning.field}`, { value: warning.value })}
                      </Text>
                    ))}
                  </Stack>
                ))}
              </Stack>
            </ScrollArea>
            {rows.length > 20 ? (
              <Pagination
                total={Math.ceil(rows.length / 20)}
                value={previewPage}
                onChange={handlers.setPreviewPage}
                size="sm"
              />
            ) : null}
          </>
        ) : null}

        {busy ? (
          <Text size="sm" role="status">
            {t('issueImport.progress', { current: progress, total: importableRows.length })}
          </Text>
        ) : null}

        {result ? (
          <>
            <Alert
              color={result.failed.length > 0 ? 'yellow' : 'green'}
              variant="light"
              role="status"
            >
              {t('issueImport.complete', {
                imported: result.imported,
                failed: result.failed.length,
              })}
            </Alert>
            {result.failed.length > 0 ? (
              <ScrollArea h={120} type="auto">
                <Stack gap={4}>
                  {result.failed.slice(0, 20).map((message) => (
                    <Text key={message} size="xs" c="var(--mantine-color-error)">
                      {message}
                    </Text>
                  ))}
                </Stack>
              </ScrollArea>
            ) : null}
          </>
        ) : null}

        <Group justify="flex-end">
          <Button type="button" variant="subtle" disabled={busy} onClick={handlers.close}>
            {t('ui.close')}
          </Button>
          <Button
            type="button"
            disabled={busy || reading || result !== null || importableRows.length === 0}
            loading={busy}
            onClick={() => void handlers.importIssues()}
          >
            {t('issueImport.importCount', { count: importableRows.length })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
