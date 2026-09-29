import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { projectWorkflowStatusCategory, useProjectWorkflow } from '../project-workflow.tsx';
import type { Issue } from '../types.ts';

type Props = {
  identifier: string;
  issue: Issue | null;
  setError: (message: string) => void;
  onCloseIssueOptions: () => void;
};

export function useIssueDetailConversions({
  identifier,
  issue,
  setError,
  onCloseIssueOptions,
}: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [projectConversionOpen, setProjectConversionOpen] = useState(false);
  const [projectConversionName, setProjectConversionName] = useState('');
  const [projectConversionDescription, setProjectConversionDescription] = useState('');
  const [projectConversionStatus, setProjectConversionStatus] = useState('planned');
  const [projectConversionPriority, setProjectConversionPriority] = useState(0);
  const [projectConversionStartDate, setProjectConversionStartDate] = useState('');
  const [projectConversionTargetDate, setProjectConversionTargetDate] = useState('');

  async function createIssueTemplate() {
    const name = templateName.trim();
    if (!name) return;
    await api.createIssueTemplate(identifier, name);
    setTemplateOpen(false);
    setTemplateName('');
  }

  async function createProjectFromIssue() {
    const name = projectConversionName.trim();
    if (!name || !issue) return;
    try {
      const result = await api.convertIssueToProject(identifier, {
        name,
        description: projectConversionDescription,
        status: projectWorkflowStatusCategory(projectConversionStatus, projectWorkflowStatuses),
        workflowStatus: projectConversionStatus,
        priority: projectConversionPriority,
        ...(projectConversionStartDate ? { startDate: projectConversionStartDate } : {}),
        ...(projectConversionTargetDate ? { targetDate: projectConversionTargetDate } : {}),
      });
      setProjectConversionOpen(false);
      await router.invalidate();
      signals.dispatchEvent(new Event('kotowari:refresh'));
      await navigate({ to: '/projects/$slug', params: { slug: result.project.slug } });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'failed to convert issue to project');
    }
  }

  return {
    data: {
      templateOpen,
      templateName,
      projectConversionOpen,
      projectConversionName,
      projectConversionDescription,
      projectConversionStatus,
      projectWorkflowStatuses,
      projectConversionPriority,
      projectConversionStartDate,
      projectConversionTargetDate,
    },
    handlers: {
      onOpenConvertToTemplate: () => {
        onCloseIssueOptions();
        setTemplateName(issue?.title ?? '');
        setTemplateOpen(true);
      },
      onCloseConvertToTemplate: () => setTemplateOpen(false),
      onOpenConvertToProject: () => {
        if (!issue) return;
        onCloseIssueOptions();
        setProjectConversionName(issue.title);
        setProjectConversionDescription(issue.body);
        setProjectConversionStatus(
          issue.status === 'in_progress'
            ? 'started'
            : issue.status === 'done'
              ? 'completed'
              : issue.status === 'canceled'
                ? 'canceled'
                : 'planned',
        );
        setProjectConversionPriority(issue.priority);
        setProjectConversionStartDate('');
        setProjectConversionTargetDate(issue.dueDate?.slice(0, 10) ?? '');
        setProjectConversionOpen(true);
      },
      onCloseConvertToProject: () => setProjectConversionOpen(false),
      Project_conversion_name_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setProjectConversionName(e.target.value),
      Project_conversion_description_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setProjectConversionDescription(e.target.value),
      Project_conversion_status_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setProjectConversionStatus(e.target.value),
      Project_conversion_priority_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setProjectConversionPriority(Number(e.target.value)),
      Project_conversion_start_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setProjectConversionStartDate(e.target.value),
      Project_conversion_target_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setProjectConversionTargetDate(e.target.value),
      onCreateProjectFromIssue: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createProjectFromIssue();
      },
      onTemplateNameChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setTemplateName(e.target.value),
      onCreateIssueTemplate: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createIssueTemplate();
      },
    },
  };
}
