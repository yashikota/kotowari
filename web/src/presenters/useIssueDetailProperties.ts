import type * as React from 'react';
import { useState } from 'react';
import type {
  IssueOptionalProperty,
  IssuePropertyMenu,
  OptionalIssuePropertyVisibility,
} from '../issue-property-model.ts';
import type { Issue } from '../types.ts';

const ISSUE_PROPERTY_VISIBILITY_KEY = 'kotowari.issue-property-visibility.v1';

type OptionalPropertyOverrides = Record<string, Partial<Record<IssueOptionalProperty, boolean>>>;

type Props = {
  identifier: string;
  issue: Issue | null;
  setIssue: (issue: Issue) => void;
  patch: (body: Record<string, unknown>) => Promise<void>;
};

function readOptionalPropertyOverrides(): OptionalPropertyOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(ISSUE_PROPERTY_VISIBILITY_KEY) ?? '{}',
    );
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {};
    return stored as OptionalPropertyOverrides;
  } catch {
    return {};
  }
}

export function useIssueDetailProperties({ identifier, issue, setIssue, patch }: Props) {
  const [optionalPropertyOverrides, setOptionalPropertyOverrides] =
    useState<OptionalPropertyOverrides>(readOptionalPropertyOverrides);
  const [issuePropertyMenu, setIssuePropertyMenu] = useState<IssuePropertyMenu>(null);
  const due = issue?.dueDate?.slice(0, 10) ?? '';
  const propertyOverrides = optionalPropertyOverrides[identifier] ?? {};
  const optionalIssuePropertyVisibility: OptionalIssuePropertyVisibility = {
    dueDate: propertyOverrides.dueDate ?? Boolean(due),
    milestone: propertyOverrides.milestone ?? issue?.milestoneId != null,
    parent: propertyOverrides.parent ?? issue?.parentId != null,
    type: propertyOverrides.type ?? Boolean(issue?.type),
  };

  return {
    data: { due, issuePropertyMenu, optionalIssuePropertyVisibility },
    handlers: {
      onTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        if (issue) setIssue({ ...issue, title: e.target.value });
      },
      onTitleBlur: () => (issue ? patch({ title: issue.title }) : undefined),
      onStatusChange: (value: string | null) =>
        value ? patch({ workflowStatus: value }) : undefined,
      onOpenIssuePropertyMenu: (property: IssuePropertyMenu) => setIssuePropertyMenu(property),
      onCloseIssuePropertyMenu: () => setIssuePropertyMenu(null),
      onToggleIssuePropertyMenu: (property: Exclude<IssuePropertyMenu, null>) =>
        setIssuePropertyMenu((current) => (current === property ? null : property)),
      onAssigneeChange: (value: string | null) =>
        patch({ assignee: value === 'self' || value === 'agent' ? value : null }),
      onTypeChange: (value: string | null) =>
        patch({ type: value && value !== 'none' ? value : '' }),
      onPriorityChange: (value: string | null) =>
        value ? patch({ priority: Number(value) }) : undefined,
      onEstimateChange: (value: string | null) =>
        patch({ estimate: value && value !== 'none' ? Number(value) : null }),
      onProjectChange: (value: string | null) =>
        patch({ projectId: value && value !== 'none' ? Number(value) : null }),
      onMilestoneChange: (value: string | null) =>
        patch({ milestoneId: value && value !== 'none' ? Number(value) : null }),
      onCycleChange: (value: string | null) =>
        patch({ cycleId: value && value !== 'none' ? Number(value) : null }),
      onParentChange: (value: string | null) =>
        patch({ parentId: value && value !== 'none' ? Number(value) : null }),
      onPropertyDueDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => patch({ dueDate: e.target.value ? e.target.value : null }),
      onToggleIssueOptionalProperty: (property: IssueOptionalProperty) => {
        const nextOverrides = {
          ...optionalPropertyOverrides,
          [identifier]: {
            ...propertyOverrides,
            [property]: !optionalIssuePropertyVisibility[property],
          },
        };
        setOptionalPropertyOverrides(nextOverrides);
        window.localStorage.setItem(ISSUE_PROPERTY_VISIBILITY_KEY, JSON.stringify(nextOverrides));
      },
    },
  };
}
