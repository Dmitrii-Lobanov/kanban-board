import { type DragEvent, type FormEvent, useState } from "react";
import type {
  CreateTaskRequest,
  EditTaskRequest,
  WorkspaceMemberResponse,
} from "@kanban-board/contracts";
import type { PersistedTask, TaskStatus } from "../../domain/task";
import { TaskDetailSelects } from "../SelectControl/TaskDetailSelects";
import { TaskCard } from "../TaskCard";
import styles from "./KanbanBoardColumn.module.css";

interface KanbanBoardColumnProps {
  title: string;
  status: TaskStatus;
  tasks: PersistedTask[];
  pendingTaskIds: ReadonlySet<string>;
  taskErrors: Record<string, string | undefined>;
  members: WorkspaceMemberResponse[];
  onCreateTask: (request: Omit<CreateTaskRequest, "columnId">) => Promise<void>;
  onDeleteTask: (taskId: string, expectedVersion: number) => Promise<void>;
  onUpdateTask: (taskId: string, request: EditTaskRequest) => Promise<void>;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDropTask: (
    event: DragEvent<HTMLElement>,
    destinationStatus: TaskStatus,
    beforeTaskId: string | null
  ) => void;
}

export function KanbanBoardColumn({
  title,
  status,
  tasks,
  pendingTaskIds,
  taskErrors,
  members,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  onStatusChange,
  onDragStart,
  onDropTask,
}: KanbanBoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<NonNullable<CreateTaskRequest["priority"]>>("MEDIUM");
  const [createError, setCreateError] = useState<string>();
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
    onDropTask(event, status, null);
  };

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTaskTitle.trim();

    if (!title) {
      setCreateError("Enter a task title.");
      return;
    }

    setCreateError(undefined);
    setIsCreating(true);

    try {
      await onCreateTask({
        title,
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
        assigneeId: newTaskAssigneeId || null,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("MEDIUM");
      setNewTaskAssigneeId("");
      setIsAddingTask(false);
    } catch {
      setCreateError("Unable to create the task. Please try again.");
    } finally {
      setIsCreating(false);
    }
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

        <div className={styles.headerActions}>
          <span className={styles.count} aria-label={`${tasks.length} tasks`}>
            {tasks.length}
          </span>
          <button
            type="button"
            className={styles.addButton}
            aria-label={`Add task to ${title}`}
            onClick={() => {
              setCreateError(undefined);
              setIsAddingTask(current => !current);
            }}
          >
            <span className={styles.addIcon} aria-hidden="true" />
          </button>
        </div>
      </header>

      {isAddingTask ? (
        <form className={styles.createForm} onSubmit={handleCreateTask}>
          <label className={styles.createLabel} htmlFor={`${headingId}-title`}>
            Task title
          </label>
          <input
            id={`${headingId}-title`}
            className={styles.createInput}
            value={newTaskTitle}
            maxLength={200}
            autoFocus
            disabled={isCreating}
            onChange={event => setNewTaskTitle(event.target.value)}
          />
          <label
            className={styles.createLabel}
            htmlFor={`${headingId}-description`}
          >
            Description
          </label>
          <textarea
            id={`${headingId}-description`}
            className={styles.createInput}
            value={newTaskDescription}
            maxLength={2000}
            rows={3}
            disabled={isCreating}
            onChange={event => setNewTaskDescription(event.target.value)}
          />
          <TaskDetailSelects
            priority={newTaskPriority}
            assigneeId={newTaskAssigneeId}
            members={members}
            disabled={isCreating}
            onPriorityChange={setNewTaskPriority}
            onAssigneeChange={setNewTaskAssigneeId}
          />
          <div className={styles.createActions}>
            <button type="submit" disabled={isCreating}>
              {isCreating ? "Adding…" : "Add task"}
            </button>
            <button
              type="button"
              disabled={isCreating}
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle("");
                setNewTaskDescription("");
                setNewTaskPriority("MEDIUM");
                setNewTaskAssigneeId("");
                setCreateError(undefined);
              }}
            >
              Cancel
            </button>
          </div>
          {createError ? (
            <p className={styles.createError} role="alert">
              {createError}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className={styles.tasks}>
        {tasks.length > 0 ? (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isPending={pendingTaskIds.has(task.id)}
              error={taskErrors[task.id]}
              members={members}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
              onDrop={event => {
                event.stopPropagation();
                setIsDragOver(false);
                onDropTask(event, status, task.id);
              }}
            />
          ))
        ) : (
          <p className={styles.empty}>No tasks in this column.</p>
        )}
      </div>
    </section>
  );
}
