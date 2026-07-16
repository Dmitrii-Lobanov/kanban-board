import { type DragEvent, useId } from "react";
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
  const generatedId = useId();
  const pendingMessageId = `${generatedId}-pending`;
  const errorMessageId = `${generatedId}-error`;
  const dragInstructionsId = `${generatedId}-drag-instructions`;

  const describedBy = [
    dragInstructionsId,
    isPending ? pendingMessageId : undefined,
    error ? errorMessageId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={styles.card}
      aria-busy={isPending}
      aria-describedby={describedBy}
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

      <p id={dragInstructionsId} className={styles.visuallyHidden}>
        This task can be moved using the buttons below. Pointer users can also
        drag it into another column.
      </p>

      {isPending && (
        <p id={pendingMessageId} className={styles.pending} aria-live="polite">
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
                ? `Currently in ${option.label}`
                : `Move to ${option.label}`}
            </button>
          );
        })}
      </div>

      {error && (
        <p id={errorMessageId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
