import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { ApiError } from "../api/api-error";
import { moveTask } from "../api/tasks";
import type { PersistedTask, TaskStatus } from "../domain/task";
import { movePersistedTask } from "../domain/taskUtils";
import { boardsQueryKey } from "../features/boards/hooks/useBoards";

interface OptimisticTaskUpdate {
  taskId: string;
  status: TaskStatus;
  columnId: string;
  position: number;
}

type TaskErrors = Record<string, string | undefined>;

interface UseTaskStatusMutationResult {
  tasks: PersistedTask[];
  pendingTaskIds: ReadonlySet<string>;
  taskErrors: TaskErrors;
  changeTaskStatus: (
    taskId: string,
    nextStatus: TaskStatus,
    destinationPosition?: number
  ) => void;
}

export function useTaskStatusMutation(
  initialTasks: PersistedTask[],
  columnIdsByStatus: Record<TaskStatus, string>
): UseTaskStatusMutationResult {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [confirmedTasks, setConfirmedTasks] =
    useState<PersistedTask[]>(initialTasks);

  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set<string>());

  const [taskErrors, setTaskErrors] = useState<TaskErrors>({});

  const pendingTaskIdsRef = useRef(new Set<string>());
  const [, startTransition] = useTransition();

  useEffect(() => {
    setConfirmedTasks(initialTasks);
  }, [initialTasks]);

  const [optimisticTasks, updateOptimisticTask] = useOptimistic(
    confirmedTasks,
    (currentTasks: PersistedTask[], update: OptimisticTaskUpdate) =>
      movePersistedTask(
        currentTasks,
        update.taskId,
        update.status,
        update.columnId,
        update.position
      )
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

  const changeTaskStatus = (
    taskId: string,
    nextStatus: TaskStatus,
    requestedPosition?: number
  ) => {
    const task = optimisticTasks.find(currentTask => currentTask.id === taskId);

    if (
      !task ||
      task.status === nextStatus ||
      pendingTaskIdsRef.current.has(taskId)
    ) {
      return;
    }

    markTaskPending(taskId);

    const destinationColumnId = columnIdsByStatus[nextStatus];
    const destinationTaskCount = optimisticTasks.filter(
      currentTask =>
        currentTask.status === nextStatus && currentTask.id !== taskId
    ).length;
    const destinationPosition = Math.min(
      requestedPosition ?? destinationTaskCount,
      destinationTaskCount
    );

    setTaskErrors(currentErrors => ({
      ...currentErrors,
      [taskId]: undefined,
    }));

    startTransition(async () => {
      updateOptimisticTask({
        taskId,
        status: nextStatus,
        columnId: destinationColumnId,
        position: destinationPosition,
      });

      try {
        const movedTask = await moveTask(
          taskId,
          {
            columnId: destinationColumnId,
            position: destinationPosition,
            expectedVersion: task.version,
          },
          await getToken()
        );

        setConfirmedTasks(currentTasks =>
          movePersistedTask(
            currentTasks,
            taskId,
            nextStatus,
            movedTask.columnId,
            movedTask.position
          ).map(currentTask =>
            currentTask.id === taskId
              ? { ...currentTask, version: movedTask.version }
              : currentTask
          )
        );
      } catch (error) {
        setTaskErrors(currentErrors => ({
          ...currentErrors,
          [taskId]:
            error instanceof ApiError && error.status === 409
              ? "This task changed elsewhere. The board has been refreshed."
              : "Unable to update the task status. Please try again.",
        }));

        if (error instanceof ApiError && error.status === 409) {
          await queryClient.invalidateQueries({ queryKey: boardsQueryKey });
        }
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
