import { matchesDocumentDate, type DocumentDateFilter } from './date-filter.ts';
import type { Page } from './types.ts';

export type PageListOrder = 'name' | 'created' | 'updated';

export function projectPageList(
  pages: Page[],
  query: string,
  order: PageListOrder,
  direction: 'asc' | 'desc',
  dateFilter?: DocumentDateFilter,
) {
  const needle = query.trim().toLocaleLowerCase();
  const matches = pages.filter(
    (page) =>
      (!dateFilter || matchesDocumentDate(page[dateFilter.field], dateFilter)) &&
      (!needle ||
        [page.title, page.slug, ...page.tags].some((value) =>
          value.toLocaleLowerCase().includes(needle),
        )),
  );
  const included = new Set(matches.map((page) => page.id));
  const byId = new Map(pages.map((page) => [page.id, page]));
  for (const page of matches) {
    let parent = page.parentId;
    const seen = new Set<number>([page.id]);
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const ancestor = byId.get(parent);
      if (!ancestor) break;
      included.add(parent);
      parent = ancestor.parentId;
    }
  }
  const compare = (a: Page, b: Page) => {
    const value =
      order === 'name'
        ? a.title.localeCompare(b.title)
        : order === 'created'
          ? a.createdAt.localeCompare(b.createdAt)
          : a.updatedAt.localeCompare(b.updatedAt);
    return (value || a.slug.localeCompare(b.slug)) * (direction === 'asc' ? 1 : -1);
  };
  const children = new Map<number | null, Page[]>();
  for (const page of pages.filter((item) => included.has(item.id))) {
    const parent = page.parentId && included.has(page.parentId) ? page.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), page]);
  }
  for (const siblings of children.values()) siblings.sort(compare);
  const rows: { page: Page; depth: number }[] = [];
  const visited = new Set<number>();
  function visit(page: Page, depth: number) {
    if (visited.has(page.id)) return;
    visited.add(page.id);
    rows.push({ page, depth });
    for (const child of children.get(page.id) ?? []) visit(child, depth + 1);
  }
  for (const page of children.get(null) ?? []) visit(page, 0);
  for (const page of [...pages].sort(compare)) if (included.has(page.id)) visit(page, 0);
  return rows;
}

export function groupPageList(
  pages: Page[],
  projects: { id: number; name: string; slug: string }[],
  query: string,
  order: PageListOrder,
  direction: 'asc' | 'desc',
  grouping: 'none' | 'project',
  projectFilter: string,
  dateFilter?: DocumentDateFilter,
) {
  const filtered = pages.filter(
    (page) =>
      projectFilter === 'all' ||
      (projectFilter === 'none' ? !page.projectId : String(page.projectId) === projectFilter),
  );
  if (grouping === 'none')
    return projectPageList(filtered, query, order, direction, dateFilter).map((row) => ({
      ...row,
      heading: undefined as { name: string | null; count: number } | undefined,
    }));
  const groups = new Map<number | null, Page[]>();
  for (const page of filtered)
    groups.set(page.projectId ?? null, [...(groups.get(page.projectId ?? null) ?? []), page]);
  const byId = new Map(projects.map((project) => [project.id, project]));
  const name = (id: number | null) =>
    id === null ? null : (byId.get(id)?.name ?? groups.get(id)?.[0]?.projectSlug ?? String(id));
  return [...groups.entries()]
    .sort(([a], [b]) =>
      a === null ? 1 : b === null ? -1 : (name(a) ?? '').localeCompare(name(b) ?? ''),
    )
    .flatMap(([id, items]) => {
      const rows = projectPageList(items, query, order, direction, dateFilter);
      return rows.map((row, index) => ({
        ...row,
        heading: index === 0 ? { name: name(id), count: rows.length } : undefined,
      }));
    });
}

export type DocumentDisplay = {
  grouping: 'none' | 'project';
  order: PageListOrder;
  direction: 'asc' | 'desc';
  showCreated: boolean;
  showUpdated: boolean;
};
export const DEFAULT_DOCUMENT_DISPLAY: DocumentDisplay = {
  grouping: 'project',
  order: 'name',
  direction: 'asc',
  showCreated: false,
  showUpdated: false,
};
export function parseDocumentDisplay(raw: string | undefined): DocumentDisplay {
  try {
    const value = JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
    return {
      grouping: value?.grouping === 'none' ? 'none' : 'project',
      order: value?.order === 'created' || value?.order === 'updated' ? value.order : 'name',
      direction: value?.direction === 'desc' ? 'desc' : 'asc',
      showCreated: value?.showCreated === true,
      showUpdated: value?.showUpdated === true,
    };
  } catch {
    return { ...DEFAULT_DOCUMENT_DISPLAY };
  }
}
