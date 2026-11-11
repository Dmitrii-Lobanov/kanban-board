import type {
  TaskResponse,
  WorkspaceMemberResponse,
} from "@kanban-board/contracts";
import { useId } from "react";
import { SelectControl } from "./SelectControl";

interface TaskDetailSelectsProps {
  priority: TaskResponse["priority"];
  assigneeId: string;
  members: WorkspaceMemberResponse[];
  disabled: boolean;
  onPriorityChange: (value: TaskResponse["priority"]) => void;
  onAssigneeChange: (value: string) => void;
}

const UNASSIGNED = "__unassigned__";

export function TaskDetailSelects({
  priority,
  assigneeId,
  members,
  disabled,
  onPriorityChange,
  onAssigneeChange,
}: TaskDetailSelectsProps) {
  const id = useId();
  const priorityId = `${id}-priority`;
  const assigneeControlId = `${id}-assignee`;

  return (
    <>
      <label id={`${priorityId}-label`} htmlFor={priorityId}>
        Priority
      </label>
      <SelectControl
        id={priorityId}
        labelledBy={`${priorityId}-label`}
        value={priority}
        disabled={disabled}
        options={[
          { value: "LOW", label: "Low" },
          { value: "MEDIUM", label: "Medium" },
          { value: "HIGH", label: "High" },
        ]}
        onValueChange={value => {
          if (value === "LOW" || value === "MEDIUM" || value === "HIGH") {
            onPriorityChange(value);
          }
        }}
      />

      <label id={`${assigneeControlId}-label`} htmlFor={assigneeControlId}>
        Assignee
      </label>
      <SelectControl
        id={assigneeControlId}
        labelledBy={`${assigneeControlId}-label`}
        value={assigneeId || UNASSIGNED}
        disabled={disabled}
        options={[
          { value: UNASSIGNED, label: "Unassigned" },
          ...members.map(member => ({
            value: member.id,
            label: member.displayName ?? member.email ?? "Workspace member",
          })),
        ]}
        onValueChange={value => {
          onAssigneeChange(value === UNASSIGNED ? "" : value);
        }}
      />
    </>
  );
}
