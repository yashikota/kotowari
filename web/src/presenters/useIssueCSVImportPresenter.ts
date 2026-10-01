import { useRouter } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { planIssueCSVImport } from '../issue-import.ts';
import type { IssueImportPlanRow } from '../issue-import.ts';
import type { Cycle, Label, Project } from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_ISSUES = 5000;

export function useIssueCSVImportPresenter({
  onClose,
  projects,
  cycles,
  labels,
}: {
  onClose: () => void;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { statuses } = useIssueWorkflow();
  const fileReadVersion = useRef(0);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<IssueImportPlanRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; failed: string[] } | null>(null);

  const importableRows = rows.filter((row) => !row.error);
  const skippedRows = rows.length - importableRows.length;
  const warningCount = rows.reduce((count, row) => count + row.warnings.length, 0);

  async function chooseFile(file?: File) {
    if (!file) return;
    const version = ++fileReadVersion.current;
    setReading(true);
    setPreviewPage(1);
    setFileName(file.name);
    setRows([]);
    setError('');
    setResult(null);
    setProgress(0);
    if (file.size > MAX_FILE_SIZE) {
      setError(t('issueImport.fileTooLarge'));
      setReading(false);
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
      if (version !== fileReadVersion.current) return;
      if (planned.length > MAX_ISSUES) {
        setError(t('issueImport.tooManyRows', { count: MAX_ISSUES }));
        return;
      }
      setRows(planned);
    } catch (cause) {
      if (version !== fileReadVersion.current) return;
      const message = cause instanceof Error ? cause.message : '';
      const translatedErrors: Record<string, string> = {
        EMPTY_CSV: t('issueImport.fileError.empty'),
        INVALID_CSV: t('issueImport.fileError.invalid'),
        MISSING_TITLE_COLUMN: t('issueImport.fileError.missingTitleColumn'),
        TOO_MANY_ROWS: t('issueImport.tooManyRows', { count: MAX_ISSUES }),
      };
      setError(translatedErrors[message] ?? (message || t('issueImport.readFailed')));
    } finally {
      if (version === fileReadVersion.current) setReading(false);
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
    fileReadVersion.current += 1;
    setReading(false);
    setFileName('');
    setRows([]);
    setError('');
    setResult(null);
    setProgress(0);
    onClose();
  }

  return {
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
    handlers: { chooseFile, importIssues, close, setPreviewPage },
  };
}
