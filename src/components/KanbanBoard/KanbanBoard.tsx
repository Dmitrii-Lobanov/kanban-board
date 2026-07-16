import {
  type DragEvent,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { updateTaskStatus } from "../../api/tasks";
import { initialTasks } from "../../data/initialTasks";
import type { Task, TaskStatus } from "../../domain/task";
import { KanbanBoardColumn } from "../KanbanBoardColumn";
import { TaskFilters } from "../TaskFilters";
import {
  filterTasks,
  getAssignees,
  groupTasksByStatus,
  replaceTaskStatus,
} from "../../domain/taskUtils";
import styles from "./KanbanBoard.module.css";

interface ColumnConfiguration {
  status: TaskStatus;
  title: string;
}

interface OptimisticTaskUpdate {
  taskId: string;
  status: TaskStatus;
}

type TaskErrors = Record<string, string | undefined>;

const TASK_DRAG_DATA_TYPE = "application/x-kanban-task-id";

const columns: ColumnConfiguration[] = [
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

function createEmptyTaskGroups(): Record<TaskStatus, Task[]> {
  return {
    todo: [],
    "in-progress": [],
    done: [],
  };
}

export function KanbanBoard() {
  const [confirmedTasks, setConfirmedTasks] = useState<Task[]>(initialTasks);

  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set<string>());

  const [taskErrors, setTaskErrors] = useState<TaskErrors>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [, startTransition] = useTransition();

  const [optimisticTasks, updateOptimisticTask] = useOptimistic(
    confirmedTasks,
    (currentTasks: Task[], update: OptimisticTaskUpdate): Task[] =>
      replaceTaskStatus(currentTasks, update.taskId, update.status)
  );

  const assignees = useMemo(
    () => getAssignees(confirmedTasks),
    [confirmedTasks]
  );

  const visibleTasks = useMemo(
    () =>
      filterTasks(optimisticTasks, {
        searchQuery,
        assignee: assigneeFilter,
      }),
    [optimisticTasks, searchQuery, assigneeFilter]
  );

  const tasksByStatus = useMemo(
    () => groupTasksByStatus(visibleTasks),
    [visibleTasks]
  );

  const handleStatusChange = (taskId: string, nextStatus: TaskStatus) => {
    const task = optimisticTasks.find(currentTask => currentTask.id === taskId);

    if (!task || task.status === nextStatus || pendingTaskIds.has(taskId)) {
      return;
    }

    setPendingTaskIds(currentIds => {
      const nextIds = new Set(currentIds);

      nextIds.add(taskId);

      return nextIds;
    });

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
        setPendingTaskIds(currentIds => {
          const nextIds = new Set(currentIds);

          nextIds.delete(taskId);

          return nextIds;
        });
      }
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TASK_DRAG_DATA_TYPE, taskId);
    event.dataTransfer.setData("text/plain", taskId);
  };

  const handleDropTask = (
    event: DragEvent<HTMLElement>,
    destinationStatus: TaskStatus
  ) => {
    event.preventDefault();

    const taskId =
      event.dataTransfer.getData(TASK_DRAG_DATA_TYPE) ||
      event.dataTransfer.getData("text/plain");

    if (!taskId) {
      return;
    }

    handleStatusChange(taskId, destinationStatus);
  };

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Frontend system design case study</p>

        <h1 className={styles.heading}>Reliable Kanban Board</h1>

        <p className={styles.description}>
          A React and TypeScript implementation focused on state consistency,
          optimistic updates, and per-task concurrency.
        </p>
      </header>

      <TaskFilters
        searchQuery={searchQuery}
        assigneeFilter={assigneeFilter}
        assignees={assignees}
        onSearchQueryChange={setSearchQuery}
        onAssigneeFilterChange={setAssigneeFilter}
      />

      <div className={styles.board}>
        {columns.map(column => (
          <KanbanBoardColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={tasksByStatus[column.status]}
            pendingTaskIds={pendingTaskIds}
            taskErrors={taskErrors}
            onStatusChange={handleStatusChange}
            onDragStart={handleDragStart}
            onDropTask={handleDropTask}
          />
        ))}
      </div>
    </main>
  );
}
