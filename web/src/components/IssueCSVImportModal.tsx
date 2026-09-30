import { useRouter } from '@tanstack/react-router';
import { Alert, Badge, Button, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { IconFileImport } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { planIssueCSVImport } from '../issue-import.ts';
import type { IssueImportPlanRow } from '../issue-import.ts';
import type { Cycle, Label, Project } from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_ISSUES = 5000;

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
  const router = useRouter();
  const { statuses } = useIssueWorkflow();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<IssueImportPlanRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; failed: string[] } | null>(null);

  const importableRows = rows.filter((row) => !row.error);
  const skippedRows = rows.length - importableRows.length;
  const warningCount = rows.reduce((count, row) => count + row.warnings.length, 0);

  async function chooseFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setError('');
    setResult(null);
    setProgress(0);
    if (file.size > MAX_FILE_SIZE) {
      setError(t('issueImport.fileTooLarge'));
      return;
    }
    try {
      const content = await file.text();
      const context = {
        statuses,
        projects,
        cycles,
        labels,
      };
      let planned = planIssueCSVImport(content, { ...context, issues: [] });
      if (planned.some((row) => row.warnings.some((warning) => warning.field === 'parent'))) {
        planned = planIssueCSVImport(content, { ...context, issues: await api.issues() });
      }
      if (planned.length > MAX_ISSUES) {
        setError(t('issueImport.tooManyRows', { count: MAX_ISSUES }));
        return;
      }
      setRows(planned);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      const translatedErrors: Record<string, string> = {
        EMPTY_CSV: t('issueImport.fileError.empty'),
        INVALID_CSV: t('issueImport.fileError.invalid'),
        MISSING_TITLE_COLUMN: t('issueImport.fileError.missingTitleColumn'),
        TOO_MANY_ROWS: t('issueImport.tooManyRows', { count: MAX_ISSUES }),
      };
      setError(translatedErrors[message] ?? (message || t('issueImport.readFailed')));
    }
  }

  async function importIssues() {
    if (busy || importableRows.length === 0) return;
    setBusy(true);
    setError('');
    setProgress(0);
    const failed: string[] = [];
    let imported = 0;
    for (const [index, row] of importableRows.entries()) {
      try {
        await api.createIssue(row.issue);
        imported += 1;
      } catch (cause) {
        failed.push(
          t('issueImport.rowFailed', {
            row: row.rowNumber,
            title: row.title,
            reason: cause instanceof Error ? cause.message : String(cause),
          }),
        );
      }
      setProgress(index + 1);
    }
    if (imported > 0) await router.invalidate().catch(() => undefined);
    setResult({ imported, failed });
    setBusy(false);
  }

  function close() {
    if (busy) return;
    setFileName('');
    setRows([]);
    setError('');
    setResult(null);
    setProgress(0);
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
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
            void chooseFile(event.currentTarget.files?.[0]);
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
                {rows.slice(0, 20).map((row) => (
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
                      <Text size="xs" c="red">
                        {t(`issueImport.error.${row.error}`)}
                      </Text>
                    ) : null}
                    {row.warnings.map((warning, index) => (
                      <Text key={`${warning.field}:${index}`} size="xs" c="yellow.8">
                        {t(`issueImport.warning.${warning.field}`, { value: warning.value })}
                      </Text>
                    ))}
                  </Stack>
                ))}
                {rows.length > 20 ? (
                  <Text size="xs" c="dimmed">
                    {t('issueImport.moreRows', { count: rows.length - 20 })}
                  </Text>
                ) : null}
              </Stack>
            </ScrollArea>
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
                    <Text key={message} size="xs" c="red">
                      {message}
                    </Text>
                  ))}
                </Stack>
              </ScrollArea>
            ) : null}
          </>
        ) : null}

        <Group justify="flex-end">
          <Button type="button" variant="subtle" disabled={busy} onClick={close}>
            {t('ui.close')}
          </Button>
          <Button
            type="button"
            disabled={busy || result !== null || importableRows.length === 0}
            loading={busy}
            onClick={() => void importIssues()}
          >
            {t('issueImport.importCount', { count: importableRows.length })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
