import type * as React from 'react';
import { useRef, useState } from 'react';
import type { IssueSearch } from '../api.ts';
import type { Cycle, Label, Project } from '../types.ts';

type Props = {
  search: IssueSearch;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  onChange: (next: IssueSearch) => void;
  onSaveView?: (name: string) => Promise<void>;
  find?: string;
  onFind?: (q: string) => void;
};

export function useIssueFiltersPresenter({
  search,
  projects,
  cycles,
  labels,
  onChange,
  onSaveView,
  find,
  onFind,
}: Props) {
  const [viewName, setViewName] = useState('');
  const findRef = useRef<HTMLInputElement>(null);

  const selectedLabels = (search.labels ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  function set(patch: IssueSearch) {
    onChange({ ...search, ...patch });
  }

  return {
    _view: 0 as const,
    search,
    projects,
    cycles,
    labels,
    onChange,
    onSaveView,
    find,
    onFind,
    viewName,
    findRef,
    selectedLabels,
    handlers: {
      Filter_status_onChange0: (value: string | null) => set({ status: value || undefined }),
      Filter_project_onChange1: (value: string | null) => set({ project: value || undefined }),
      Filter_cycle_onChange2: (value: string | null) =>
        set({ cycle: value ? Number(value) : undefined }),
      Filter_priority_onChange3: (value: string | null) =>
        set({ priority: value === null || value === '' ? undefined : Number(value) }),
      Find_issues_onChange4: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => onFind?.(e.target.value),
      onClick5: (on: boolean, l: Label) => {
        const next = on ? selectedLabels.filter((n) => n !== l.name) : [...selectedLabels, l.name];
        set({ labels: next.length ? next.join(',') : undefined });
      },
      onSubmit6: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        e.preventDefault();
        const name = viewName.trim();
        if (!name) return;
        return onSaveView?.(name).then(() => setViewName(''));
      },
      New_view_name_onChange7: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setViewName(e.target.value),
    },
  };
}
