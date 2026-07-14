export const TASK_STATUSES = [
  "todo",
  "in-progress",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
}
