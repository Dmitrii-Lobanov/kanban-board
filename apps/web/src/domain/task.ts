import { COLUMN_KEYS, type ColumnKey } from "@kanban-board/contracts";

export const TASK_STATUSES = COLUMN_KEYS;

export type TaskStatus = ColumnKey;

export interface Task {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
}
