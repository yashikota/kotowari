export type IssueSelectionRange = { anchorId: string; baseIds: string[] };

export type IssueSelectionState = {
  selectedIds: string[];
  anchorId: string | null;
  range: IssueSelectionRange | null;
};

export function toggleIssueSelection(
  state: IssueSelectionState,
  id: string,
  checked: boolean,
): IssueSelectionState {
  if (checked) {
    return {
      selectedIds: state.selectedIds.includes(id) ? state.selectedIds : [...state.selectedIds, id],
      anchorId: id,
      range: null,
    };
  }

  return {
    selectedIds: state.selectedIds.filter((selected) => selected !== id),
    anchorId:
      state.anchorId === id
        ? (state.selectedIds.find((selected) => selected !== id) ?? null)
        : state.anchorId,
    range: null,
  };
}

export function extendIssueSelection(
  ids: string[],
  state: IssueSelectionState,
  targetId: string,
  requestedAnchorId?: string,
): IssueSelectionState {
  const targetIndex = ids.indexOf(targetId);
  if (targetIndex < 0) return state;

  const candidateAnchorId = requestedAnchorId ?? state.anchorId;
  const anchorId =
    candidateAnchorId && ids.includes(candidateAnchorId) ? candidateAnchorId : targetId;
  const anchorIndex = ids.indexOf(anchorId);
  const baseIds =
    state.range?.anchorId === anchorId
      ? state.range.baseIds
      : state.selectedIds.filter((id) => ids.includes(id));
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);

  return {
    selectedIds: [...new Set([...baseIds, ...ids.slice(start, end + 1)])],
    anchorId,
    range: { anchorId, baseIds },
  };
}

export function selectIssueIds(ids: string[]): IssueSelectionState {
  const selectedIds = [...new Set(ids)];
  return {
    selectedIds,
    anchorId: selectedIds[0] ?? null,
    range: null,
  };
}

export function clearIssueSelection(): IssueSelectionState {
  return { selectedIds: [], anchorId: null, range: null };
}
