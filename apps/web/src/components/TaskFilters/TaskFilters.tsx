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

      <label className={styles.field}>
        <span className={styles.label}>Assignee</span>

        <select
          value={assigneeFilter}
          onChange={event => {
            onAssigneeFilterChange(event.target.value);
          }}
        >
          <option value="all">All assignees</option>

          {assignees.map(assignee => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
