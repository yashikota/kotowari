import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { cycleCommands, filterCommands, projectCommands, staticCommands } from '../commands.ts';
import { mediator } from '../application/mediator.ts';
import type { Cycle, Initiative, Issue, Project, SearchHit, View } from '../types.ts';

type Props = {
  paletteOpen: boolean;
  currentIdentifier: string | null;
  cycles: Cycle[];
  projects: Project[];
  favoriteIssues: Issue[];
  views: View[];
  initiatives: Initiative[];
};

export function useShellPalette({
  paletteOpen,
  currentIdentifier,
  cycles,
  projects,
  favoriteIssues,
  views,
  initiatives,
}: Props) {
  const { t } = useTranslation();
  const quickOpenTarget = useSyncExternalStore(mediator.subscribe, mediator.getQuickOpenTarget);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!paletteOpen || !query.trim()) {
      setHits([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .search(query)
        .then((value) => {
          if (active) setHits(value);
        })
        .catch(() => {
          if (active) setHits([]);
        });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, paletteOpen]);

  const quickOpenSearchCommands = hits
    .filter((hit) =>
      quickOpenTarget === 'issue'
        ? hit.kind === 'issue'
        : quickOpenTarget === 'document'
          ? hit.kind === 'page'
          : false,
    )
    .map((hit) => ({
      id: `open-${hit.kind}:${hit.id}`,
      title: `${hit.id} — ${hit.title}${hit.snippet ? ` — ${hit.snippet}` : ''}`,
    }));

  const quickOpenFavorites = [
    ...favoriteIssues.map((issue) => ({
      id: `open-issue:${issue.identifier}`,
      title: t('quickOpen.item', {
        type: t('quickOpen.kind.issue'),
        title: `${issue.identifier} — ${issue.title}`,
      }),
    })),
    ...projects
      .filter((project) => project.isFavorite)
      .map((project) => ({
        id: `open-project:${project.slug}`,
        title: t('quickOpen.item', {
          type: t('quickOpen.kind.project'),
          title: project.name,
        }),
      })),
    ...cycles
      .filter((cycle) => cycle.isFavorite)
      .map((cycle) => ({
        id: `open-cycle:${cycle.number}`,
        title: t('quickOpen.item', {
          type: t('quickOpen.kind.cycle'),
          title: cycle.name || t('field.cycleN', { number: cycle.number }),
        }),
      })),
    ...views
      .filter((view) => view.isFavorite)
      .map((view) => ({
        id: `open-view:${view.slug}`,
        title: t('quickOpen.item', {
          type: t('quickOpen.kind.view'),
          title: view.name,
        }),
      })),
  ];

  const quickOpenCollections = (() => {
    switch (quickOpenTarget) {
      case 'favorite':
        return quickOpenFavorites;
      case 'project':
        return projects.map((project) => ({
          id: `open-project:${project.slug}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.project'),
            title: project.name,
          }),
        }));
      case 'cycle':
        return cycles.map((cycle) => ({
          id: `open-cycle:${cycle.number}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.cycle'),
            title: cycle.name || t('field.cycleN', { number: cycle.number }),
          }),
        }));
      case 'view':
        return views.map((view) => ({
          id: `open-view:${view.slug}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.view'),
            title: view.name,
          }),
        }));
      case 'initiative':
        return initiatives.map((initiative) => ({
          id: `open-initiative:${initiative.slug}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.initiative'),
            title: initiative.name,
          }),
        }));
      case 'issue':
      case 'document':
      case null:
        return [];
    }
  })();

  const quickOpenTargetKind = quickOpenTarget ?? 'issue';
  const commands = quickOpenTarget
    ? [...filterCommands(quickOpenCollections, query), ...quickOpenSearchCommands]
    : [
        ...hits.map((hit) => ({
          id: `open-${hit.kind}:${hit.id}`,
          title: `${hit.kind} ${hit.id}  ${hit.title}${hit.snippet ? ` — ${hit.snippet}` : ''}`,
        })),
        ...filterCommands(
          staticCommands((key, values) => t(key, values as Record<string, string | number>)),
          query,
        ),
        ...(currentIdentifier
          ? filterCommands(
              cycleCommands(cycles, (key, values) =>
                t(key, values as Record<string, string | number>),
              ),
              query,
            )
          : []),
        ...(currentIdentifier
          ? filterCommands(
              projectCommands(projects, (key, values) =>
                t(key, values as Record<string, string | number>),
              ),
              query,
            )
          : []),
      ];

  const quickOpenEmptyMessage = quickOpenTarget
    ? quickOpenTarget === 'favorite' && !query.trim() && quickOpenFavorites.length === 0
      ? t('quickOpen.noFavorites')
      : query.trim()
        ? t('quickOpen.noResults', { type: t(`quickOpen.kind.${quickOpenTargetKind}`) })
        : quickOpenTarget === 'issue' || quickOpenTarget === 'document'
          ? t('quickOpen.typeToSearch', {
              type: t(`quickOpen.kind.${quickOpenTargetKind}`),
            })
          : undefined
    : undefined;

  return {
    data: {
      query,
      quickOpenTarget,
      commands,
      quickOpenTitle: quickOpenTarget
        ? t('quickOpen.title', { type: t(`quickOpen.kind.${quickOpenTargetKind}`) })
        : undefined,
      quickOpenPlaceholder: quickOpenTarget
        ? t('quickOpen.search', { type: t(`quickOpen.kind.${quickOpenTargetKind}`) })
        : undefined,
      quickOpenEmptyMessage,
    },
    setQuery,
  };
}
