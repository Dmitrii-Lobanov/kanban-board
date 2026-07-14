import { useMemo, useState } from "react";
import { initialTasks } from "../data/tasks";
import type { TaskStatus } from "../domain/task";
import { KanbanBoardColumn } from "./KanbanBoardColumn";
import { columns } from "../domain/columns";

export function KanbanBoard() {
  const [tasks] = useState(initialTasks);

  const tasksByStatus = useMemo(
    () =>
      tasks.reduce<Record<TaskStatus, typeof tasks>>(
        (groups, task) => {
          groups[task.status].push(task);
          return groups;
        },
        {
          todo: [],
          "in-progress": [],
          done: [],
        }
      ),
    [tasks]
  );

  return (
    <main>
      <header>
        <p>Frontend system design case study</p>
        <h1>Reliable Kanban Board</h1>
      </header>

      <div>
        {columns.map(column => (
          <KanbanBoardColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={tasksByStatus[column.status]}
          />
        ))}
      </div>
    </main>
  );
}