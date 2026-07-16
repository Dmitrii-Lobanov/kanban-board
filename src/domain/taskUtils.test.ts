import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import {
  filterTasks,
  getAssignees,
  groupTasksByStatus,
  replaceTaskStatus,
} from "./taskUtils";

const tasks: Task[] = [
  {
    id: "task-1",
    title: "Implement optimistic updates",
    assignee: "Alice",
    status: "todo",
  },
  {
    id: "task-2",
    title: "Build native drag-and-drop",
    assignee: "Bob",
    status: "in-progress",
  },
  {
    id: "task-3",
    title: "Write integration tests",
    assignee: "Alice",
    status: "done",
  },
];

describe("replaceTaskStatus", () => {
  it("updates only the matching task", () => {
    const result = replaceTaskStatus(tasks, "task-1", "in-progress");

    expect(result[0]).toEqual({
      ...tasks[0],
      status: "in-progress",
    });

    expect(result[1]).toBe(tasks[1]);
    expect(result[2]).toBe(tasks[2]);
  });

  it("does not mutate the original collection", () => {
    replaceTaskStatus(tasks, "task-1", "done");

    expect(tasks[0].status).toBe("todo");
  });

  it("returns equivalent task data when the ID is unknown", () => {
    const result = replaceTaskStatus(tasks, "missing-task", "done");

    expect(result).toEqual(tasks);
  });
});

describe("filterTasks", () => {
  it("filters tasks by title case-insensitively", () => {
    const result = filterTasks(tasks, {
      searchQuery: "OPTIMISTIC",
      assignee: "all",
    });

    expect(result.map(task => task.id)).toEqual(["task-1"]);
  });

  it("filters tasks by assignee", () => {
    const result = filterTasks(tasks, {
      searchQuery: "",
      assignee: "Alice",
    });

    expect(result.map(task => task.id)).toEqual(["task-1", "task-3"]);
  });

  it("combines title search and assignee filtering", () => {
    const result = filterTasks(tasks, {
      searchQuery: "tests",
      assignee: "Alice",
    });

    expect(result.map(task => task.id)).toEqual(["task-3"]);
  });

  it("returns all tasks when no filters are active", () => {
    const result = filterTasks(tasks, {
      searchQuery: "   ",
      assignee: "all",
    });

    expect(result).toEqual(tasks);
  });
});

describe("groupTasksByStatus", () => {
  it("groups tasks into their corresponding columns", () => {
    const result = groupTasksByStatus(tasks);

    expect(result.todo.map(task => task.id)).toEqual(["task-1"]);

    expect(result["in-progress"].map(task => task.id)).toEqual(["task-2"]);

    expect(result.done.map(task => task.id)).toEqual(["task-3"]);
  });

  it("creates empty arrays for statuses without tasks", () => {
    const result = groupTasksByStatus([tasks[0]]);

    expect(result.todo).toHaveLength(1);
    expect(result["in-progress"]).toEqual([]);
    expect(result.done).toEqual([]);
  });
});

describe("getAssignees", () => {
  it("returns unique assignees in alphabetical order", () => {
    expect(getAssignees(tasks)).toEqual(["Alice", "Bob"]);
  });
});
