import type { Task, TaskStatus } from "../../domain/task";
import { TaskCard } from "../TaskCard/TaskCard";

interface KanbanBoardColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
}

export function KanbanBoardColumn({
  title,
  status,
  tasks,
}: KanbanBoardColumnProps) {
  const headingId = `column-${status}`;

  return (
    <section aria-labelledby={headingId}>
      <header>
        <h2 id={headingId}>{title}</h2>
        <span aria-label={`${tasks.length} tasks`}>{tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <p>No tasks in this column.</p>
      ) : (
        tasks.map(task => <TaskCard key={task.id} task={task} />)
      )}
    </section>
  );
}
