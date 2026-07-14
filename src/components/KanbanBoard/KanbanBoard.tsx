import { useMemo, useState } from "react";
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

  const tasksByStatus = useMemo(
    () =>
      tasks.reduce<Record<TaskStatus, Task[]>>((groups, task) => {
        groups[task.status].push(task);
        return groups;
      }, createEmptyTaskGroups()),
    [tasks]
  );

  const handleStatusChange = (taskId: string, nextStatus: TaskStatus) => {
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: nextStatus,
            }
          : task
      )
    );
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
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </main>
  );
}
