import { type DragEvent, useMemo, useState } from "react";
import type { PersistedTask, TaskStatus } from "../../domain/task";
import {
  filterTasks,
  getAssignees,
  groupTasksByStatus,
} from "../../domain/taskUtils";
import { useBoards } from "../../features/boards/hooks/useBoards";
import { useTaskStatusMutation } from "../../hooks/useTaskStatusMutation";
import { KanbanBoardColumn } from "../KanbanBoardColumn";
import { TaskFilters } from "../TaskFilters";
import styles from "./KanbanBoard.module.css";

interface ColumnConfiguration {
  status: TaskStatus;
  title: string;
}

const TASK_DRAG_DATA_TYPE = "application/x-kanban-task-id";

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

interface BoardContentProps {
  initialTasks: PersistedTask[];
  columnIdsByStatus: Record<TaskStatus, string>;
}

function BoardContent({ initialTasks, columnIdsByStatus }: BoardContentProps) {
  const { tasks, pendingTaskIds, taskErrors, changeTaskStatus } =
    useTaskStatusMutation(initialTasks, columnIdsByStatus);

  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const assignees = useMemo(() => getAssignees(tasks), [tasks]);

  const visibleTasks = useMemo(
    () =>
      filterTasks(tasks, {
        searchQuery,
        assignee: assigneeFilter,
      }),
    [tasks, searchQuery, assigneeFilter]
  );

  const tasksByStatus = useMemo(
    () => groupTasksByStatus(visibleTasks),
    [visibleTasks]
  );

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TASK_DRAG_DATA_TYPE, taskId);
    event.dataTransfer.setData("text/plain", taskId);
  };

  const handleDropTask = (
    event: DragEvent<HTMLElement>,
    destinationStatus: TaskStatus
  ) => {
    event.preventDefault();

    const taskId =
      event.dataTransfer.getData(TASK_DRAG_DATA_TYPE) ||
      event.dataTransfer.getData("text/plain");

    if (!taskId) {
      return;
    }

    changeTaskStatus(taskId, destinationStatus);
  };

  return (
    <>
      <TaskFilters
        searchQuery={searchQuery}
        assigneeFilter={assigneeFilter}
        assignees={assignees}
        onSearchQueryChange={setSearchQuery}
        onAssigneeFilterChange={setAssigneeFilter}
      />

      <div className={styles.board}>
        {columns.map(column => (
          <KanbanBoardColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={tasksByStatus[column.status]}
            pendingTaskIds={pendingTaskIds}
            taskErrors={taskErrors}
            onStatusChange={changeTaskStatus}
            onDragStart={handleDragStart}
            onDropTask={handleDropTask}
          />
        ))}
      </div>
    </>
  );
}

export function KanbanBoard() {
  const boardsQuery = useBoards();

  if (boardsQuery.isPending) {
    return <div>Loading board…</div>;
  }

  if (boardsQuery.isError) {
    return <div>Failed to load the board.</div>;
  }

  const board = boardsQuery.data[0];

  if (!board) {
    return <div>No boards found.</div>;
  }

  const initialTasks: PersistedTask[] = board.columns.flatMap(column =>
    column.tasks.map(task => ({
      id: task.id,
      title: task.title,
      assignee: "Unassigned",
      status: column.key,
      columnId: task.columnId,
      position: task.position,
      version: task.version,
    }))
  );

  const todoColumn = board.columns.find(column => column.key === "todo");
  const inProgressColumn = board.columns.find(
    column => column.key === "in-progress"
  );
  const doneColumn = board.columns.find(column => column.key === "done");

  if (!todoColumn || !inProgressColumn || !doneColumn) {
    return <div>Board columns are incomplete.</div>;
  }

  const columnIdsByStatus: Record<TaskStatus, string> = {
    todo: todoColumn.id,
    "in-progress": inProgressColumn.id,
    done: doneColumn.id,
  };

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Full-stack system design case study</p>

        <h1 className={styles.heading}>Reliable Kanban Board</h1>

        <p className={styles.description}>
          A React, TypeScript, NestJS, and PostgreSQL implementation focused on
          state consistency, optimistic updates, and concurrency.
        </p>
      </header>

      <BoardContent
        initialTasks={initialTasks}
        columnIdsByStatus={columnIdsByStatus}
      />
    </main>
  );
}
