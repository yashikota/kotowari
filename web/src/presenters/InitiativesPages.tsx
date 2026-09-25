import { useLoaderData, useNavigate, useRouter } from '@tanstack/react-router';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { queryCache } from '../application/cache.ts';
import type { Initiative, InitiativeStatus } from '../types.ts';

function initiativeSlug(name: string, existing: Initiative[]): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const slug = base || `initiative-${crypto.randomUUID().slice(0, 8)}`;
  if (!existing.some((initiative) => initiative.slug === slug)) return slug;
  let suffix = 2;
  while (existing.some((initiative) => initiative.slug === `${slug}-${suffix}`)) suffix += 1;
  return `${slug}-${suffix}`;
}

export function useInitiativesPagePresenter() {
  const { initiatives, projects } = useLoaderData({ from: '/initiatives' });
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('planned');
  const [color, setColor] = useState('purple');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.createInitiative({
        name: name.trim(),
        slug: initiativeSlug(name, initiatives),
        description,
        status,
        color,
        ...(startDate ? { startDate } : {}),
        ...(targetDate ? { targetDate } : {}),
      });
      queryCache.invalidate();
      await router.invalidate();
      await navigate({ to: '/initiatives/$slug', params: { slug: created.slug } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return {
    _view: 0 as const,
    initiatives,
    projects,
    createOpen,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    error,
    saving,
    handlers: {
      onOpenCreate: () => {
        setName('');
        setDescription('');
        setStatus('planned');
        setColor('purple');
        setStartDate('');
        setTargetDate('');
        setError('');
        setCreateOpen(true);
      },
      onCloseCreate: () => setCreateOpen(false),
      onNameChange: (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
      onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setDescription(event.target.value),
      onStatusChange: (value: string | null) => setStatus((value ?? 'planned') as InitiativeStatus),
      onColorChange: (value: string | null) => setColor(value ?? 'purple'),
      onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value),
      onTargetDateChange: (event: ChangeEvent<HTMLInputElement>) =>
        setTargetDate(event.target.value),
      onSubmitCreate: createInitiative,
      onOpenInitiative: (initiative: Initiative) =>
        void navigate({ to: '/initiatives/$slug', params: { slug: initiative.slug } }),
      onProjectOpen: (slug: string) => void navigate({ to: '/projects/$slug', params: { slug } }),
      onStatusLabel: (value: InitiativeStatus) => t(`initiatives.${value}`),
    },
  };
}

export function useInitiativeDetailPresenter() {
  const { initiative, projects } = useLoaderData({ from: '/initiatives/$slug' });
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const [name, setName] = useState(initiative.name);
  const [description, setDescription] = useState(initiative.description);
  const [status, setStatus] = useState<InitiativeStatus>(initiative.status);
  const [color, setColor] = useState(initiative.color ?? 'purple');
  const [startDate, setStartDate] = useState(initiative.startDate ?? '');
  const [targetDate, setTargetDate] = useState(initiative.targetDate ?? '');
  const [projectSlugs, setProjectSlugs] = useState(initiative.projectSlugs);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await api.patchInitiative(initiative.slug, {
        name,
        description,
        status,
        color,
        ...(startDate ? { startDate } : { clearStartDate: true }),
        ...(targetDate ? { targetDate } : { clearTargetDate: true }),
        projectSlugs,
      });
      queryCache.invalidate();
      await router.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteInitiative() {
    if (!window.confirm(t('initiatives.deleteConfirm'))) return;
    setSaving(true);
    setError('');
    try {
      await api.deleteInitiative(initiative.slug);
      queryCache.invalidate();
      await navigate({ to: '/initiatives' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
      setSaving(false);
    }
  }

  return {
    _view: 0 as const,
    initiative,
    projects,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    projectSlugs,
    availableProjects: projects.map((project) => ({ value: project.slug, label: project.name })),
    linkedProjects: projects.filter((project) => projectSlugs.includes(project.slug)),
    error,
    saving,
    handlers: {
      onNameChange: (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
      onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setDescription(event.target.value),
      onStatusChange: (value: string | null) => setStatus((value ?? 'planned') as InitiativeStatus),
      onColorChange: (value: string | null) => setColor(value ?? 'purple'),
      onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value),
      onTargetDateChange: (event: ChangeEvent<HTMLInputElement>) =>
        setTargetDate(event.target.value),
      onProjectSlugsChange: setProjectSlugs,
      onSubmit: saveInitiative,
      onDelete: deleteInitiative,
      onBack: () => void navigate({ to: '/initiatives' }),
      onProjectOpen: (slug: string) => void navigate({ to: '/projects/$slug', params: { slug } }),
      onStatusLabel: (value: InitiativeStatus) => t(`initiatives.${value}`),
    },
  };
}
