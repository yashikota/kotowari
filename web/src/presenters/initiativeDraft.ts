import type { Initiative, InitiativeStatus } from '../types.ts';

export type InitiativeDraft = {
  name: string;
  description: string;
  status: InitiativeStatus;
  owner: '' | 'self';
  color: string;
  priority: number;
  labels: string[];
  projectSlugs: string[];
  startDate: string;
  targetDate: string;
};

export function initiativeDraft(entity: Initiative): InitiativeDraft {
  return {
    name: entity.name,
    description: entity.description,
    status: entity.status,
    owner: entity.owner ?? '',
    color: entity.color ?? 'purple',
    priority: entity.priority ?? 0,
    labels: [...(entity.labels ?? [])],
    projectSlugs: [...entity.projectSlugs],
    startDate: entity.startDate ?? '',
    targetDate: entity.targetDate ?? '',
  };
}

function sameValue(
  first: InitiativeDraft[keyof InitiativeDraft],
  second: InitiativeDraft[keyof InitiativeDraft],
) {
  if (Array.isArray(first) && Array.isArray(second))
    return JSON.stringify([...first].sort()) === JSON.stringify([...second].sort());
  return first === second;
}

export function sameInitiativeDraft(first: InitiativeDraft, second: InitiativeDraft) {
  return (Object.keys(first) as (keyof InitiativeDraft)[]).every((key) =>
    sameValue(first[key], second[key]),
  );
}

/** Refresh untouched fields while preserving every independently edited field. */
export function reconcileInitiativeDraft(
  draft: InitiativeDraft,
  baseline: InitiativeDraft,
  incoming: InitiativeDraft,
) {
  return Object.fromEntries(
    (Object.keys(draft) as (keyof InitiativeDraft)[]).map((key) => [
      key,
      sameValue(draft[key], baseline[key]) ? incoming[key] : draft[key],
    ]),
  ) as InitiativeDraft;
}

export function initiativePatch(draft: InitiativeDraft, baseline: InitiativeDraft) {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(draft) as (keyof InitiativeDraft)[]) {
    if (sameValue(draft[key], baseline[key])) continue;
    if ((key === 'startDate' || key === 'targetDate') && !draft[key])
      patch[key === 'startDate' ? 'clearStartDate' : 'clearTargetDate'] = true;
    else patch[key] = key === 'name' ? draft.name.trim() : draft[key];
  }
  return patch;
}
