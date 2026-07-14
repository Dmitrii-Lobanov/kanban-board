import type { Task, TaskStatus } from "../../domain/task";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
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

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{task.title}</h3>

      <p className={styles.assignee}>
        Assigned to <strong>{task.assignee}</strong>
      </p>

      <div className={styles.actions} aria-label={`Move ${task.title}`}>
        {statusOptions.map(option => {
          const isCurrentStatus = option.status === task.status;

          return (
            <button
              key={option.status}
              type="button"
              disabled={isCurrentStatus}
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
    </article>
  );
}
