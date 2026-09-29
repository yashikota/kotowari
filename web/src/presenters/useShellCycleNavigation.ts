import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';

type Props = {
  pathname: string;
  scope: 'current' | 'upcoming' | undefined;
  cycles: Cycle[];
};

export function useShellCycleNavigation({ pathname, scope, cycles }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [cycleNavigationOpen, setCycleNavigationOpen] = useState(false);
  const [cycleNavigationQuery, setCycleNavigationQuery] = useState('');
  const isCycleDetail = pathname.startsWith('/cycles/');
  const currentCycleNumber = isCycleDetail ? Number(pathname.slice('/cycles/'.length)) : 0;
  const currentCycle = cycles.find((cycle) => cycle.number === currentCycleNumber);
  const currentCycleName = currentCycle?.name || t('field.cycleN', { number: currentCycleNumber });
  const cycleListScope = pathname === '/cycles' ? scope : undefined;

  const query = cycleNavigationQuery.trim().toLocaleLowerCase(i18n.language);
  const matches = cycles.filter((candidate) => {
    if (candidate.number === currentCycleNumber) return false;
    if (!query) return true;
    const name = candidate.name || t('field.cycleN', { number: candidate.number });
    return `${name} ${candidate.number}`.toLocaleLowerCase(i18n.language).includes(query);
  });
  const next = matches
    .filter((candidate) => candidate.status === 'upcoming' && candidate.number > currentCycleNumber)
    .sort((a, b) => a.number - b.number);
  const previous = matches
    .filter(
      (candidate) => candidate.status === 'completed' && candidate.number < currentCycleNumber,
    )
    .sort((a, b) => b.number - a.number);

  function navigateToCycle(number: number) {
    setCycleNavigationOpen(false);
    setCycleNavigationQuery('');
    void navigate({ to: '/cycles/$number', params: { number: String(number) } });
  }

  return {
    data: {
      currentCycleName,
      currentCycleStatus: currentCycle?.status,
      cycleListScope,
      cycleNavigationOpen,
      cycleNavigationQuery,
      nextCycles: query ? next : next.slice(0, 1),
      previousCycles: query ? previous : previous.slice(0, 1),
    },
    handlers: {
      onCycleNavigationOpenChange: (opened: boolean) => {
        setCycleNavigationOpen(opened);
        if (!opened) setCycleNavigationQuery('');
      },
      onCycleNavigationQueryChange: (value: string) => setCycleNavigationQuery(value),
      onNavigateCycle: navigateToCycle,
    },
  };
}
