import type { Issue, IssueStatus } from './types.ts';

export type IssueBoardColumnProps = {
  issues: Issue[];
  status: string;
  category: IssueStatus;
  name: string;
  dragId: string | null;
  onDrag: (id: string | null) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
};
