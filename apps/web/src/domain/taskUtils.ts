import type { Task, TaskStatus } from "./task";

export interface TaskFilters {
  searchQuery: string;
  assignee: string;
}

export function replaceTaskStatus<T extends Task>(
  tasks: T[],
  taskId: string,
  status: TaskStatus
): T[] {
  return tasks.map(task =>
    task.id === taskId
      ? {
          ...task,
          status,
        }
      : task
  );
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  return tasks.filter(task => {
    const matchesSearch =
      normalizedQuery.length === 0 ||
      task.title.toLowerCase().includes(normalizedQuery);

    const matchesAssignee =
      filters.assignee === "all" || task.assignee === filters.assignee;

    return matchesSearch && matchesAssignee;
  });
}

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return tasks.reduce<Record<TaskStatus, Task[]>>(
    (groups, task) => {
      groups[task.status]?.push(task);

      return groups;
    },
    {
      todo: [],
      "in-progress": [],
      done: [],
    }
  );
}

export function getAssignees(tasks: Task[]): string[] {
  return Array.from(new Set(tasks.map(task => task.assignee))).sort();
}
