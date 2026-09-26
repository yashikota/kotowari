export type ProjectBoardGroup = {
  key: string;
  label: string;
  visible: boolean;
};

export function orderProjectBoardGroups(
  groups: ProjectBoardGroup[],
  preferredOrder: readonly string[] = [],
): ProjectBoardGroup[] {
  const groupsByKey = new Map(groups.map((group) => [group.key, group]));
  const ordered: ProjectBoardGroup[] = [];
  const seen = new Set<string>();
  for (const key of preferredOrder) {
    const group = groupsByKey.get(key);
    if (!group || seen.has(key)) continue;
    ordered.push(group);
    seen.add(key);
  }
  for (const group of groups) {
    if (seen.has(group.key)) continue;
    ordered.push(group);
    seen.add(group.key);
  }
  return ordered;
}

export function moveProjectBoardGroup(
  order: readonly string[],
  key: string,
  destinationIndex: number,
): string[] {
  const sourceIndex = order.indexOf(key);
  if (sourceIndex < 0 || order.length < 2) return [...order];
  const next = [...order];
  const [group] = next.splice(sourceIndex, 1);
  if (!group) return [...order];
  next.splice(Math.max(0, Math.min(destinationIndex, next.length)), 0, group);
  return next;
}
