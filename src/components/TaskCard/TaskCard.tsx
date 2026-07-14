import type { Task } from "../../domain/task";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{task.title}</h3>

      <p className={styles.assignee}>
        Assigned to <strong>{task.assignee}</strong>
      </p>
    </article>
  );
}
