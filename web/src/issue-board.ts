import type { Issue, IssueStatus } from './types.ts';

export type IssueBoardColumnProps = {
  issues: Issue[];
  status: string;
  category: IssueStatus;
  name: string;
  canReorder: boolean;
  dragId: string | null;
  onDrag: (id: string | null) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
  onMoveToAdjacentColumn: (id: string, status: string, direction: -1 | 1) => void;
};
