export const COLUMN_KEYS = ["todo", "in-progress", "done"] as const;

export type ColumnKey = (typeof COLUMN_KEYS)[number];

export type TaskResponse = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  position: number;
  version: number;
  columnId: string;
  createdAt: string;
  updatedAt: string;
};

export type MoveTaskRequest = {
  columnId: string;
  position: number;
  expectedVersion: number;
};

export type ColumnResponse = {
  id: string;
  title: string;
  key: ColumnKey;
  position: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  tasks: TaskResponse[];
};

export type BoardResponse = {
  id: string;
  title: string;
  position: number;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  columns: ColumnResponse[];
};
