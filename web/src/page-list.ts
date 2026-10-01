import type { Page } from './types.ts';

export type PageListOrder = 'name' | 'created' | 'updated';

export function projectPageList(
  pages: Page[],
  query: string,
  order: PageListOrder,
  direction: 'asc' | 'desc',
) {
  const needle = query.trim().toLocaleLowerCase();
  const matches = pages.filter(
    (page) =>
      !needle ||
      [page.title, page.slug, ...page.tags].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      ),
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
