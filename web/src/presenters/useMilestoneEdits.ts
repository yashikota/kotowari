import { useEffect, useRef, useState } from 'react';
import type { ProjectMilestone } from '../types.ts';
import i18n from '../i18n/index.ts';

export type MilestoneDraft = { name: string; description: string; targetDate: string | null };
export type MilestoneEditState = {
  draft: MilestoneDraft;
  pending: boolean;
  saved: boolean;
  error: string;
  nameError: string;
  validationAttempt: number;
};
const draftOf = (milestone: ProjectMilestone): MilestoneDraft => ({
  name: milestone.name,
  description: milestone.description ?? '',
  targetDate: milestone.targetDate?.slice(0, 10) || null,
});
const same = (a: MilestoneDraft, b: MilestoneDraft) =>
  a.name === b.name && a.description === b.description && a.targetDate === b.targetDate;
const initial = (draft: MilestoneDraft): MilestoneEditState => ({
  draft,
  pending: false,
  saved: false,
  error: '',
  nameError: '',
  validationAttempt: 0,
});

/** Row writes preserve drafts independently, while the project owns one navigation guard. */
export function useMilestoneEdits({
  scope,
  milestones,
  save,
  onSaved,
}: {
  scope: string;
  milestones: ProjectMilestone[];
  save: (id: number, draft: MilestoneDraft) => Promise<ProjectMilestone>;
  onSaved: (milestone: ProjectMilestone) => void;
}) {
  const [rows, setRows] = useState<Record<number, MilestoneEditState>>({});
  const current = useRef(rows);
  const baseline = useRef(new Map(milestones.map((item) => [item.id, draftOf(item)])));
  const pending = useRef(new Set<number>());
  const generation = useRef(0);
  function update(next: Record<number, MilestoneEditState>) {
    current.current = next;
    setRows(next);
  }
  useEffect(() => {
    generation.current++;
    pending.current.clear();
    baseline.current = new Map(milestones.map((item) => [item.id, draftOf(item)]));
    update({});
    return () => {
      generation.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- milestones are reconciled separately.
  }, [scope]);
  useEffect(() => {
    const next: Record<number, MilestoneEditState> = {};
    const nextBaseline = new Map<number, MilestoneDraft>();
    for (const milestone of milestones) {
      const value = draftOf(milestone);
      nextBaseline.set(milestone.id, value);
      const row = current.current[milestone.id];
      const old = baseline.current.get(milestone.id);
      next[milestone.id] = row
        ? { ...row, draft: old && !same(row.draft, old) ? row.draft : value }
        : initial(value);
    }
    baseline.current = nextBaseline;
    update(next);
  }, [milestones, scope]);
  function change(id: number, field: keyof MilestoneDraft, value: string) {
    if (pending.current.has(id)) return;
    const row = current.current[id];
    if (!row) return;
    update({
      ...current.current,
      [id]: {
        ...row,
        draft: { ...row.draft, [field]: field === 'targetDate' ? value || null : value },
        saved: false,
        error: '',
        nameError: '',
        validationAttempt: 0,
      },
    });
  }
  async function commit(id: number, focusInvalid = false) {
    if (pending.current.has(id)) return false;
    const row = current.current[id];
    const base = baseline.current.get(id);
    if (!row || !base || same(row.draft, base)) return true;
    if (!row.draft.name.trim()) {
      update({
        ...current.current,
        [id]: {
          ...row,
          nameError: i18n.t('milestoneCreation.nameRequired'),
          validationAttempt: focusInvalid ? row.validationAttempt + 1 : 0,
        },
      });
      return false;
    }
    const token = generation.current;
    const body = { ...row.draft, name: row.draft.name.trim() };
    pending.current.add(id);
    update({
      ...current.current,
      [id]: { ...row, pending: true, saved: false, error: '', nameError: '' },
    });
    try {
      const result = await save(id, body);
      if (generation.current !== token) return false;
      const value = draftOf(result);
      baseline.current.set(id, value);
      update({ ...current.current, [id]: { ...initial(value), saved: true } });
      onSaved(result);
      return true;
    } catch (cause) {
      if (generation.current === token) {
        const latest = current.current[id];
        if (latest)
          update({
            ...current.current,
            [id]: {
              ...latest,
              pending: false,
              error: cause instanceof Error ? cause.message : String(cause),
            },
          });
      }
      return false;
    } finally {
      if (generation.current === token) pending.current.delete(id);
    }
  }
  const dirty = Object.entries(rows).some(([id, row]) => {
    const base = baseline.current.get(Number(id));
    return base && !same(row.draft, base);
  });
  return {
    rows,
    dirty,
    pending: Object.values(rows).some((row) => row.pending),
    error:
      Object.values(rows)
        .map((row) => row.error || row.nameError)
        .find(Boolean) ?? '',
    isPending: () => pending.current.size > 0,
    change,
    commit,
    saveAll: async () => {
      if (pending.current.size > 0) return false;
      for (const id of Object.keys(current.current)) {
        if (!(await commit(Number(id)))) return false;
      }
      return true;
    },
  };
}
