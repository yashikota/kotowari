import { useMemo, useRef, useState } from 'react';
import {
  clearIssueSelection,
  extendIssueSelection,
  selectIssueIds,
  toggleIssueSelection,
} from '../issue-selection.ts';
import type { IssueSelectionState } from '../issue-selection.ts';

export function useIssueSelection(ids: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const anchorRef = useRef<string | null>(null);
  const rangeRef = useRef<{ anchorId: string; baseIds: string[] } | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function applySelection(next: IssueSelectionState) {
    anchorRef.current = next.anchorId;
    rangeRef.current = next.range;
    setSelectedIds(next.selectedIds);
  }

  function clear() {
    applySelection(clearIssueSelection());
  }

  function extend(targetId: string, requestedAnchorId?: string) {
    applySelection(
      extendIssueSelection(
        ids,
        { selectedIds, anchorId: anchorRef.current, range: rangeRef.current },
        targetId,
        requestedAnchorId,
      ),
    );
  }

  function toggle(id: string, checked: boolean, shiftKey = false) {
    if (shiftKey) {
      extend(id);
      return;
    }
    applySelection(
      toggleIssueSelection(
        { selectedIds, anchorId: anchorRef.current, range: rangeRef.current },
        id,
        checked,
      ),
    );
  }

  function select(selected: string[]) {
    applySelection(selectIssueIds(selected));
  }

  return {
    selectedIds,
    selectedIdSet,
    anchorId: anchorRef.current,
    clear,
    extend,
    toggle,
    select,
  };
}
