import { useId } from "react";
import { SelectControl } from "../SelectControl/SelectControl";
import styles from "./TaskFilters.module.css";

interface TaskFiltersProps {
  searchQuery: string;
  assigneeFilter: string;
  assignees: string[];
  onSearchQueryChange: (value: string) => void;
  onAssigneeFilterChange: (value: string) => void;
}

export function TaskFilters({
  searchQuery,
  assigneeFilter,
  assignees,
  onSearchQueryChange,
  onAssigneeFilterChange,
}: TaskFiltersProps) {
  const assigneeId = useId();
  const assigneeLabelId = `${assigneeId}-label`;

  return (
    <section className={styles.filters} aria-label="Task filters">
      <label className={styles.field}>
        <span className={styles.label}>Search tasks</span>

        <input
          type="search"
          value={searchQuery}
          placeholder="Search by title"
          onChange={event => {
            onSearchQueryChange(event.target.value);
          }}
        />
      </label>

      <div className={styles.field}>
        <label
          id={assigneeLabelId}
          htmlFor={assigneeId}
          className={styles.label}
        >
          Assignee
        </label>

        <SelectControl
          id={assigneeId}
          labelledBy={assigneeLabelId}
          value={assigneeFilter}
          onValueChange={onAssigneeFilterChange}
          options={[
            { value: "all", label: "All assignees" },
            ...assignees.map(assignee => ({
              value: assignee,
              label: assignee,
            })),
          ]}
        />
      </div>
    </section>
  );
}
