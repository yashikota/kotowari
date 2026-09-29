import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import { isSubmitShortcut } from '../keymap.ts';
import { LABEL_COLORS } from '../label-colors.ts';
import type { Issue, Label } from '../types.ts';

type Props = {
  issue: Issue | null;
  labels: Label[];
  setLabels: (labels: Label[]) => void;
  patch: (body: Record<string, unknown>) => Promise<void>;
};

export function useIssueDetailLabels({ issue, labels, setLabels, patch }: Props) {
  const [labelName, setLabelName] = useState('');
  const [focusLabel, setFocusLabel] = useState(0);
  const selectedLabelIds = new Set(issue?.labels.map((label) => label.id) ?? []);

  async function addLabel() {
    const name = labelName.trim();
    if (!name || !issue) return;
    const created = await api.createLabel({
      name,
      color: LABEL_COLORS[labels.length % LABEL_COLORS.length] ?? '#c4a574',
    });
    setLabelName('');
    setFocusLabel((current) => current + 1);
    setLabels(await api.labels());
    await patch({ labelIds: [...issue.labels.map((label) => label.id), created.id] });
  }

  return {
    data: { labelName, focusLabel, selectedLabelIds },
    handlers: {
      onToggleIssueLabel: (label: Label) => {
        if (!issue) return;
        const isSelected = issue.labels.some((current) => current.id === label.id);
        const next = isSelected
          ? issue.labels.filter((current) => current.id !== label.id).map((current) => current.id)
          : [...issue.labels.map((current) => current.id), label.id];
        return patch({ labelIds: next });
      },
      onLabelQueryChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setLabelName(e.target.value),
      onLabelQueryKeyDown: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return addLabel();
        }
      },
      onCreateLabel: () => addLabel(),
    },
  };
}
