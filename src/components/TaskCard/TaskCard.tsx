import type { Task } from "../../domain/task";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <article>
      <h3>{task.title}</h3>
      <p>Assigned to {task.assignee}</p>
    </article>
  );
}
