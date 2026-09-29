import { useState } from 'react';
import { api } from '../api.ts';
import { useTranslation } from 'react-i18next';

export function useIssueComposerAttachments() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  function onChange(nextFiles: File[]) {
    if (nextFiles.length > 10) {
      setFiles([]);
      setError(t('issueAttachments.tooMany'));
      return;
    }
    if (nextFiles.some((file) => file.size === 0)) {
      setFiles([]);
      setError(t('issueAttachments.emptyFile'));
      return;
    }
    if (nextFiles.some((file) => file.size > 20 * 1024 * 1024)) {
      setFiles([]);
      setError(t('issueAttachments.tooLarge'));
      return;
    }
    setFiles(nextFiles);
    setError('');
  }

  function clear() {
    setFiles([]);
    setError('');
  }

  async function upload(issueIdentifier: string) {
    if (files.length === 0) return false;
    try {
      await api.addIssueAttachments(issueIdentifier, files);
      return false;
    } catch {
      return true;
    }
  }

  return { files, error, onChange, clear, upload };
}
