import type * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isWebCodingToolURLTemplate,
  useCodingToolPreferences,
  type CodingToolPreferences,
} from '../coding-tools.ts';

export function useConfigCodingTools() {
  const { t } = useTranslation();
  const { preferences, update: updatePreferences } = useCodingToolPreferences();
  const [draft, setDraft] = useState(preferences);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(preferences), [preferences]);

  return {
    data: { codingToolDraft: draft, codingToolError: error, codingToolSaved: saved },
    handlers: {
      onCodingToolEnabledChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const enabled = event.currentTarget.checked;
        setSaved(false);
        setDraft((current) => ({ ...current, customLinkEnabled: enabled }));
      },
      onCodingToolNameChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const name = event.currentTarget.value;
        setSaved(false);
        setDraft((current) => ({ ...current, customLinkName: name }));
      },
      onCodingToolURLChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const url = event.currentTarget.value;
        setSaved(false);
        setDraft((current) => ({ ...current, customLinkURL: url }));
      },
      onCodingToolPromptChange: (
        event: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        const prompt = event.currentTarget.value;
        setSaved(false);
        setDraft((current) => ({ ...current, promptTemplate: prompt }));
      },
      onSaveCodingTools: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const next: CodingToolPreferences = {
          ...draft,
          customLinkName: draft.customLinkName.trim() || 'Custom link',
          customLinkURL: draft.customLinkURL.trim(),
        };
        if (!next.promptTemplate.trim()) {
          setError(t('codingTools.promptRequired'));
          setSaved(false);
          return;
        }
        if (next.customLinkEnabled && !isWebCodingToolURLTemplate(next.customLinkURL)) {
          setError(t('codingTools.invalidURL'));
          setSaved(false);
          return;
        }
        setError('');
        setDraft(next);
        updatePreferences(next);
        setSaved(true);
      },
    },
  };
}
