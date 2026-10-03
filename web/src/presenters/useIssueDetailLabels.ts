import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
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
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState('');
  const [labelSaved, setLabelSaved] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  type Operation = { name: string; created?: Label } | { label: Label; selected: boolean };
  const failed = useRef<Operation | null>(null);
  const selectedLabelIds = new Set(issue?.labels.map((label) => label.id) ?? []);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    failed.current = null;
    setLabelName('');
    setLabelError('');
    setLabelSaving(false);
    setLabelSaved(false);
    return () => {
      generation.current++;
    };
  }, [issue?.identifier]);

  async function write(operation: Operation) {
    if (!issue || pending.current) return;
    const token = generation.current;
    pending.current = true;
    setLabelSaving(true);
    setLabelError('');
    setLabelSaved(false);
    failed.current = operation;
    try {
      let label: Label;
      let selected: boolean;
      if ('name' in operation) {
        label =
          operation.created ??
          labels.find(
            (entry) => entry.name.trim().toLocaleLowerCase() === operation.name.toLocaleLowerCase(),
          ) ??
          (await api.createLabel({
            name: operation.name,
            color: LABEL_COLORS[labels.length % LABEL_COLORS.length] ?? '#c4a574',
          }));
        operation.created = label;
        if (token !== generation.current) return;
        if (!labels.some((entry) => entry.id === label.id)) setLabels([...labels, label]);
        selected = true;
      } else {
        label = operation.label;
        selected = operation.selected;
      }
      const ids = new Set(issue.labels.map((entry) => entry.id));
      if (selected) ids.add(label.id);
      else ids.delete(label.id);
      await patch({ labelIds: [...ids] });
      if (token !== generation.current) return;
      failed.current = null;
      setLabelSaved(true);
      if ('name' in operation) setLabelName('');
    } catch (cause) {
      if (token === generation.current)
        setLabelError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setLabelSaving(false);
      }
    }
  }
  function addLabel() {
    const name = labelName.trim();
    return name ? write({ name }) : undefined;
  }

  return {
    data: { labelName, selectedLabelIds, labelSaving, labelError, labelSaved },
    handlers: {
      onToggleIssueLabel: (label: Label) => {
        if (!issue) return;
        return write({ label, selected: !selectedLabelIds.has(label.id) });
      },
      onRetryLabelSave: () => (failed.current ? write(failed.current) : undefined),
      onLabelQueryChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        if (pending.current) return;
        setLabelName(e.target.value);
        failed.current = null;
        setLabelError('');
        setLabelSaved(false);
      },
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
