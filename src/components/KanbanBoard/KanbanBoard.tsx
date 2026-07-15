import { useMemo, useState } from "react";
import { updateTaskStatus } from "../../api/tasks";
import { initialTasks } from "../../data/initialTasks";
import type { Task, TaskStatus } from "../../domain/task";
import { KanbanBoardColumn } from "../KanbanBoardColumn";
import styles from "./KanbanBoard.module.css";

interface ColumnConfiguration {
  status: TaskStatus;
  title: string;
}

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
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set<string>());

  const tasksByStatus = useMemo(
    () =>
      tasks.reduce<Record<TaskStatus, Task[]>>((groups, task) => {
        groups[task.status].push(task);

        return groups;
      }, createEmptyTaskGroups()),
    [tasks]
  );

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    const task = tasks.find(currentTask => currentTask.id === taskId);

    if (!task) {
      return;
    }

    if (task.status === nextStatus) {
      return;
    }

    if (pendingTaskIds.has(taskId)) {
      return;
    }

    setPendingTaskIds(currentIds => {
      const nextIds = new Set(currentIds);

      nextIds.add(taskId);

      return nextIds;
    });

    try {
      await updateTaskStatus(taskId, nextStatus);

      setTasks(currentTasks =>
        currentTasks.map(currentTask =>
          currentTask.id === taskId
            ? {
                ...currentTask,
                status: nextStatus,
              }
            : currentTask
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setPendingTaskIds(currentIds => {
        const nextIds = new Set(currentIds);

        nextIds.delete(taskId);

        return nextIds;
      });
    }
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

      <div className={styles.board}>
        {columns.map(column => (
          <KanbanBoardColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={tasksByStatus[column.status]}
            pendingTaskIds={pendingTaskIds}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </main>
  );
}
