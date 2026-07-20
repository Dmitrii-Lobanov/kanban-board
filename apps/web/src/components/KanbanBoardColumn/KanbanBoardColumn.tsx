import { type DragEvent, useState } from "react";
import type { Task, TaskStatus } from "../../domain/task";
import { TaskCard } from "../TaskCard";
import styles from "./KanbanBoardColumn.module.css";

interface KanbanBoardColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  pendingTaskIds: ReadonlySet<string>;
  taskErrors: Record<string, string | undefined>;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDropTask: (
    event: DragEvent<HTMLElement>,
    destinationStatus: TaskStatus
  ) => void;
}

export function KanbanBoardColumn({
  title,
  status,
  tasks,
  pendingTaskIds,
  taskErrors,
  onStatusChange,
  onDragStart,
  onDropTask,
}: KanbanBoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const headingId = `column-${status}`;

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    setIsDragOver(false);
    onDropTask(event, status);
  };

  return (
    <section
      className={`${styles.column} ${isDragOver ? styles.dragOver : ""}`}
      aria-labelledby={headingId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>

        <span className={styles.count} aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </header>

      <div className={styles.tasks}>
        {tasks.length > 0 ? (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isPending={pendingTaskIds.has(task.id)}
              error={taskErrors[task.id]}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
            />
          ))
        ) : (
          <p className={styles.empty}>No tasks in this column.</p>
        )}
      </div>
    </section>
  );
}
