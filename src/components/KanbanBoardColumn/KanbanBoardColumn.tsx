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
}

export function KanbanBoardColumn({
  title,
  status,
  tasks,
  pendingTaskIds,
  taskErrors,
  onStatusChange,
}: KanbanBoardColumnProps) {
  const headingId = `column-${status}`;

  return (
    <section className={styles.column} aria-labelledby={headingId}>
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
            />
          ))
        ) : (
          <p className={styles.empty}>No tasks in this column.</p>
        )}
      </div>
    </section>
  );
}
