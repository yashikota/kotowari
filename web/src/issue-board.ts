import type { Issue, IssueStatus } from './types.ts';

export type IssueBoardColumnProps = {
  issues: Issue[];
  status: string;
  category: IssueStatus;
  name: string;
  canReorder: boolean;
  dragId: string | null;
  onDrag: (id: string | null) => void;
  bulkSelectedIdSet: ReadonlySet<string>;
  onToggleSelection: (id: string, checked: boolean, shiftKey?: boolean) => void;
  onExtendSelection: (anchorId: string, targetId: string) => void;
  onSelectAll: () => void;
  onSelectColumn: () => void;
  onClearSelection: () => void;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
  onMoveToAdjacentColumn: (id: string, status: string, direction: -1 | 1) => void;
};
