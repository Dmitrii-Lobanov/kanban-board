import type {
  EditTaskRequest,
  WorkspaceMemberResponse,
} from "@kanban-board/contracts";
import { type DragEvent, type FormEvent, useId, useState } from "react";
import { ApiError } from "../../api/api-error";
import type { PersistedTask, TaskStatus } from "../../domain/task";
import { TaskDetailSelects } from "../SelectControl/TaskDetailSelects";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: PersistedTask;
  isPending: boolean;
  error?: string;
  members: WorkspaceMemberResponse[];
  onDeleteTask: (taskId: string, expectedVersion: number) => Promise<void>;
  onUpdateTask: (taskId: string, request: EditTaskRequest) => Promise<void>;
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
  members,
  onDeleteTask,
  onUpdateTask,
  onStatusChange,
  onDragStart,
  onDrop,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(task);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string>();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
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

    const changes: EditTaskRequest["changes"] = {};
    const revisions = editBaseline.fieldRevisions;
    const nextTitle = title.trim();
    const nextDescription = description.trim() || null;
    const nextAssigneeId = assigneeId || null;

    if (nextTitle !== editBaseline.title.trim()) {
      changes.title = {
        value: nextTitle,
        expectedRevision: revisions.title,
      };
    }

    if (nextDescription !== (editBaseline.description?.trim() || null)) {
      changes.description = {
        value: nextDescription,
        expectedRevision: revisions.description,
      };
    }

    if (priority !== editBaseline.priority) {
      changes.priority = {
        value: priority,
        expectedRevision: revisions.priority,
      };
    }

    if (nextAssigneeId !== editBaseline.assigneeId) {
      changes.assigneeId = {
        value: nextAssigneeId,
        expectedRevision: revisions.assigneeId,
      };
    }

    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }

    setEditError(undefined);
    setIsSaving(true);

    try {
      await onUpdateTask(task.id, { changes });
      setIsEditing(false);
    } catch (updateError) {
      setEditError(
        updateError instanceof ApiError && updateError.status === 409
          ? "This task changed elsewhere. Your draft is still here. Copy any text you want to keep before closing and reopening the editor."
          : "Unable to update the task. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(undefined);
    setIsDeleting(true);

    try {
      await onDeleteTask(task.id, task.version);
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError instanceof ApiError &&
          deleteRequestError.status === 409
          ? "This task changed elsewhere. Review the refreshed task and try again."
          : "Unable to delete the task. Please try again."
      );
      setIsDeleting(false);
    }
  };

  return (
    <article
      className={styles.card}
      aria-busy={isPending}
      aria-describedby={describedBy}
      draggable={!isPending && !isEditing && !isConfirmingDelete}
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
            setEditBaseline(task);
            setDescription(task.description ?? "");
            setPriority(task.priority);
            setAssigneeId(task.assigneeId ?? "");
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
          <TaskDetailSelects
            priority={priority}
            assigneeId={assigneeId}
            members={members}
            disabled={isSaving}
            onPriorityChange={setPriority}
            onAssigneeChange={setAssigneeId}
          />
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

      {isConfirmingDelete ? (
        <div className={styles.deleteConfirmation} role="alertdialog">
          <p>Delete this task? This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <button type="button" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Deleting…" : "Delete task"}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setIsConfirmingDelete(false);
                setDeleteError(undefined);
              }}
            >
              Keep task
            </button>
          </div>
          {deleteError ? (
            <p className={styles.error} role="alert">
              {deleteError}
            </p>
          ) : null}
        </div>
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

      <button
        type="button"
        className={styles.deleteButton}
        disabled={isPending || isSaving || isDeleting}
        onClick={() => {
          setIsEditing(false);
          setDeleteError(undefined);
          setIsConfirmingDelete(current => !current);
        }}
      >
        {isConfirmingDelete ? "Close deletion" : "Delete"}
      </button>

      {error && (
        <p id={errorMessageId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
