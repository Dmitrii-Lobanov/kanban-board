import { useOptimistic, useRef, useState, useTransition } from "react";
import { updateTaskStatus } from "../api/tasks";
import type { Task, TaskStatus } from "../domain/task";
import { replaceTaskStatus } from "../domain/taskUtils";

interface OptimisticTaskUpdate {
  taskId: string;
  status: TaskStatus;
}

type TaskErrors = Record<string, string | undefined>;

interface UseTaskStatusMutationResult {
  tasks: Task[];
  pendingTaskIds: ReadonlySet<string>;
  taskErrors: TaskErrors;
  changeTaskStatus: (taskId: string, nextStatus: TaskStatus) => void;
}

export function useTaskStatusMutation(
  initialTasks: Task[]
): UseTaskStatusMutationResult {
  const [confirmedTasks, setConfirmedTasks] = useState<Task[]>(initialTasks);

  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set<string>());

  const [taskErrors, setTaskErrors] = useState<TaskErrors>({});

  const pendingTaskIdsRef = useRef(new Set<string>());
  const [, startTransition] = useTransition();

  const [optimisticTasks, updateOptimisticTask] = useOptimistic(
    confirmedTasks,
    (currentTasks: Task[], update: OptimisticTaskUpdate): Task[] =>
      replaceTaskStatus(currentTasks, update.taskId, update.status)
  );

  const markTaskPending = (taskId: string) => {
    pendingTaskIdsRef.current.add(taskId);

    setPendingTaskIds(currentIds => {
      const nextIds = new Set(currentIds);
      nextIds.add(taskId);

      return nextIds;
    });
  };

  const clearTaskPending = (taskId: string) => {
    pendingTaskIdsRef.current.delete(taskId);

    setPendingTaskIds(currentIds => {
      const nextIds = new Set(currentIds);
      nextIds.delete(taskId);

      return nextIds;
    });
  };

  const changeTaskStatus = (taskId: string, nextStatus: TaskStatus) => {
    const task = optimisticTasks.find(currentTask => currentTask.id === taskId);

    if (
      !task ||
      task.status === nextStatus ||
      pendingTaskIdsRef.current.has(taskId)
    ) {
      return;
    }

    markTaskPending(taskId);

    setTaskErrors(currentErrors => ({
      ...currentErrors,
      [taskId]: undefined,
    }));

    startTransition(async () => {
      updateOptimisticTask({
        taskId,
        status: nextStatus,
      });

      try {
        await updateTaskStatus(taskId, nextStatus);

        setConfirmedTasks(currentTasks =>
          replaceTaskStatus(currentTasks, taskId, nextStatus)
        );
      } catch {
        setTaskErrors(currentErrors => ({
          ...currentErrors,
          [taskId]: "Unable to update the task status. Please try again.",
        }));
      } finally {
        clearTaskPending(taskId);
      }
    });
  };

  return {
    tasks: optimisticTasks,
    pendingTaskIds,
    taskErrors,
    changeTaskStatus,
  };
}
