import type { Task } from "../domain/task";

export const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Model optimistic task state",
    assignee: "Alice",
    status: "todo",
  },
  {
    id: "task-2",
    title: "Implement asynchronous persistence",
    assignee: "Bob",
    status: "todo",
  },
  {
    id: "task-3",
    title: "Add per-task concurrency control",
    assignee: "Alice",
    status: "in-progress",
  },
  {
    id: "task-4",
    title: "Build native drag-and-drop",
    assignee: "Carla",
    status: "in-progress",
  },
  {
    id: "task-5",
    title: "Verify accessible error feedback",
    assignee: "Bob",
    status: "done",
  },
];
