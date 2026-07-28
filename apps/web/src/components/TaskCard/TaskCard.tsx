import type { UpdateTaskRequest } from "@kanban-board/contracts";
import { type DragEvent, type FormEvent, useId, useState } from "react";
import { ApiError } from "../../api/api-error";
import type { PersistedTask, TaskStatus } from "../../domain/task";
import selectStyles from "../SelectControl/SelectControl.module.css";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: PersistedTask;
  isPending: boolean;
  error?: string;
  onUpdateTask: (taskId: string, request: UpdateTaskRequest) => Promise<void>;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
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
  onUpdateTask,
  onStatusChange,
  onDragStart,
  onDrop,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string>();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
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

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setEditError("Enter a task title.");
      return;
    }

    setEditError(undefined);
    setIsSaving(true);

    try {
      await onUpdateTask(task.id, {
        title,
        description,
        priority,
        expectedVersion: task.version,
      });
      setIsEditing(false);
    } catch (updateError) {
      setEditError(
        updateError instanceof ApiError && updateError.status === 409
          ? "This task changed elsewhere. Review the refreshed task and try again."
          : "Unable to update the task. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article
      className={styles.card}
      aria-busy={isPending}
      aria-describedby={describedBy}
      draggable={!isPending && !isEditing}
      onDragStart={event => {
        if (!isPending) {
          onDragStart(event, task.id);
        }
      }}
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={onDrop}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>{task.title}</h3>
        <button
          type="button"
          className={styles.editButton}
          disabled={isPending || isSaving}
          onClick={() => {
            setTitle(task.title);
            setDescription(task.description ?? "");
            setPriority(task.priority);
            setEditError(undefined);
            setIsEditing(current => !current);
          }}
        >
          {isEditing ? "Close" : "Edit"}
        </button>
      </div>

      <span className={styles.priority}>{task.priority.toLowerCase()}</span>

      {task.description ? (
        <p className={styles.description}>{task.description}</p>
      ) : null}

      {isEditing ? (
        <form className={styles.editForm} onSubmit={handleEditSubmit}>
          <label>
            <span>Title</span>
            <input
              value={title}
              maxLength={200}
              disabled={isSaving}
              onChange={event => setTitle(event.target.value)}
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={description}
              maxLength={2000}
              rows={3}
              disabled={isSaving}
              onChange={event => setDescription(event.target.value)}
            />
          </label>
          <label>
            <span>Priority</span>
            <select
              className={selectStyles.select}
              value={priority}
              disabled={isSaving}
              onChange={event => {
                const value = event.target.value;

                if (value === "LOW" || value === "MEDIUM" || value === "HIGH") {
                  setPriority(value);
                }
              }}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <div className={styles.editActions}>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
          {editError ? (
            <p className={styles.error} role="alert">
              {editError}
            </p>
          ) : null}
        </form>
      ) : null}

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
