import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import type { Issue, IssueTemplate, Label } from '../types.ts';

type Props = {
  issue: Issue | null;
  labels: Label[];
  patch: (body: Record<string, unknown>) => Promise<void>;
  setError: (message: string) => void;
  onCloseIssueOptions: () => void;
};

export function useIssueDetailTemplateApply({
  issue,
  labels,
  patch,
  setError,
  onCloseIssueOptions,
}: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<IssueTemplate[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [applying, setApplying] = useState(false);
  const selectedTemplate = templates.find((template) => template.slug === selectedSlug) ?? null;

  async function openApplyTemplate() {
    if (!issue || issue.archivedAt) return;
    onCloseIssueOptions();
    try {
      const nextTemplates = await api.issueTemplates();
      setTemplates(nextTemplates);
      setSelectedSlug(nextTemplates[0]?.slug ?? '');
      setOpen(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'failed to load issue templates');
    }
  }

  async function applyTemplate() {
    if (!issue || !selectedTemplate || issue.archivedAt) return;
    setApplying(true);
    try {
      const availableLabelIds = new Map(labels.map((label) => [label.name, label.id]));
      await patch({
        title: selectedTemplate.title,
        body: selectedTemplate.body,
        status: selectedTemplate.status,
        assignee: selectedTemplate.assignee ?? '',
        type: selectedTemplate.type ?? '',
        priority: selectedTemplate.priority,
        estimate: selectedTemplate.estimate ?? null,
        labelIds: selectedTemplate.labels.flatMap((name) => {
          const id = availableLabelIds.get(name);
          return id === undefined ? [] : [id];
        }),
      });
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'failed to apply issue template');
    } finally {
      setApplying(false);
    }
  }

  return {
    data: {
      applyTemplateOpen: open,
      applyTemplateSlug: selectedSlug,
      applyTemplateTemplates: templates,
      applyTemplateSelected: selectedTemplate,
      applyTemplateSaving: applying,
    },
    handlers: {
      onOpenApplyTemplate: openApplyTemplate,
      onCloseApplyTemplate: () => setOpen(false),
      onApplyTemplateChange: (value: string | null) => setSelectedSlug(value ?? ''),
      onApplyTemplate: (
        event: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        event.preventDefault();
        return applyTemplate();
      },
    },
  };
}
