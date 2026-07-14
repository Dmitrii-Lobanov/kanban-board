import type { TaskStatus } from "./task";

export const columns: Array<{
  status: TaskStatus;
  title: string;
}> = [
  {
    status: "todo",
    title: "Todo",
  },
  {
    status: "in-progress",
    title: "In Progress",
  },
  {
    status: "done",
    title: "Done",
  },
];
