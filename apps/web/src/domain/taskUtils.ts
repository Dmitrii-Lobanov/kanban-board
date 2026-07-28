import {
  TASK_STATUSES,
  type PersistedTask,
  type Task,
  type TaskStatus,
} from "./task";

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

export function movePersistedTask(
  tasks: PersistedTask[],
  taskId: string,
  destinationStatus: TaskStatus,
  destinationColumnId: string,
  destinationPosition: number
): PersistedTask[] {
  const movingTask = tasks.find(task => task.id === taskId);

  if (!movingTask) {
    return tasks;
  }

  const tasksByStatus = tasks.reduce<Record<TaskStatus, PersistedTask[]>>(
    (groups, task) => {
      if (task.id !== taskId) {
        groups[task.status].push(task);
      }

      return groups;
    },
    { todo: [], "in-progress": [], done: [] }
  );

  for (const statusTasks of Object.values(tasksByStatus)) {
    statusTasks.sort((first, second) => first.position - second.position);
  }

  const destinationTasks = tasksByStatus[destinationStatus];
  const clampedPosition = Math.min(
    Math.max(destinationPosition, 0),
    destinationTasks.length
  );

  destinationTasks.splice(clampedPosition, 0, {
    ...movingTask,
    status: destinationStatus,
    columnId: destinationColumnId,
  });

  const updates = new Map<string, PersistedTask>();

  for (const status of TASK_STATUSES) {
    const statusTasks = tasksByStatus[status];

    statusTasks.forEach((task, position) => {
      updates.set(task.id, {
        ...task,
        status,
        position,
      });
    });
  }

  return tasks.map(task => updates.get(task.id) ?? task);
}

export function filterTasks<T extends Task>(
  tasks: T[],
  filters: TaskFilters
): T[] {
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

export function groupTasksByStatus<T extends Task>(
  tasks: T[]
): Record<TaskStatus, T[]> {
  return tasks.reduce<Record<TaskStatus, T[]>>(
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
