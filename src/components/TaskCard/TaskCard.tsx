import type { DragEvent } from "react";
import type { Task, TaskStatus } from "../../domain/task";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
  isPending: boolean;
  error?: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
}

const statusOptions: Array<{
  status: TaskStatus;
  label: string;
}> = [
  {
    status: "todo",
    label: "Todo",
  },
  {
    status: "in-progress",
    label: "In Progress",
  },
  {
    status: "done",
    label: "Done",
  },
];

export function TaskCard({
  task,
  isPending,
  error,
  onStatusChange,
  onDragStart,
}: TaskCardProps) {
  return (
    <article
      className={styles.card}
      aria-busy={isPending}
      draggable={!isPending}
      onDragStart={event => {
        if (!isPending) {
          onDragStart(event, task.id);
        }
      }}
    >
      <h3 className={styles.title}>{task.title}</h3>

      <p className={styles.assignee}>
        Assigned to <strong>{task.assignee}</strong>
      </p>

      {isPending && (
        <p className={styles.pending} aria-live="polite">
          Saving status…
        </p>
      )}

      <div className={styles.actions} aria-label={`Move ${task.title}`}>
        {statusOptions.map(option => {
          const isCurrentStatus = option.status === task.status;

          return (
            <button
              key={option.status}
              type="button"
              disabled={isPending || isCurrentStatus}
              aria-pressed={isCurrentStatus}
              onClick={() => {
                onStatusChange(task.id, option.status);
              }}
            >
              {isCurrentStatus
                ? `In ${option.label}`
                : `Move to ${option.label}`}
            </button>
          );
        })}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
