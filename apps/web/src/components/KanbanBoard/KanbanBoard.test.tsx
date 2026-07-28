import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardResponse, TaskResponse } from "@kanban-board/contracts";
import { ApiError } from "../../api/api-error";
import { getBoards } from "../../api/boards";
import { createTask, deleteTask, moveTask, updateTask } from "../../api/tasks";
import { KanbanBoard } from "./KanbanBoard";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-token"),
    isLoaded: true,
    isSignedIn: true,
  }),
}));

vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  moveTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../../api/boards", () => ({
  getBoards: vi.fn(),
}));

const initialBoards: BoardResponse[] = [
  {
    id: "board-1",
    title: "Board",
    position: 0,
    workspaceId: "workspace-1",
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    columns: [
      {
        id: "column-todo",
        title: "A title that does not imply status",
        key: "todo",
        position: 0,
        boardId: "board-1",
        createdAt: "2026-07-23T12:00:00.000Z",
        updatedAt: "2026-07-23T12:00:00.000Z",
        tasks: [
          {
            id: "task-1",
            title: "Model optimistic task state",
            description: null,
            priority: "MEDIUM",
            position: 0,
            version: 1,
            columnId: "column-todo",
            createdAt: "2026-07-23T12:00:00.000Z",
            updatedAt: "2026-07-23T12:00:00.000Z",
          },
        ],
      },
      {
        id: "column-progress",
        title: "Another editable title",
        key: "in-progress",
        position: 1,
        boardId: "board-1",
        createdAt: "2026-07-23T12:00:00.000Z",
        updatedAt: "2026-07-23T12:00:00.000Z",
        tasks: [
          {
            id: "task-4",
            title: "Build native drag-and-drop",
            description: null,
            priority: "HIGH",
            position: 0,
            version: 1,
            columnId: "column-progress",
            createdAt: "2026-07-23T12:00:00.000Z",
            updatedAt: "2026-07-23T12:00:00.000Z",
          },
        ],
      },
      {
        id: "column-done",
        title: "Completed work",
        key: "done",
        position: 2,
        boardId: "board-1",
        createdAt: "2026-07-23T12:00:00.000Z",
        updatedAt: "2026-07-23T12:00:00.000Z",
        tasks: [],
      },
    ],
  },
];

const mockedGetBoards = vi.mocked(getBoards);
const mockedCreateTask = vi.mocked(createTask);
const mockedDeleteTask = vi.mocked(deleteTask);
const mockedMoveTask = vi.mocked(moveTask);
const mockedUpdateTask = vi.mocked(updateTask);
const optimisticTaskTitle = "Model optimistic task state";
const draggableTaskTitle = "Build native drag-and-drop";

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: DeferredPromise<T>["resolve"];
  let reject!: DeferredPromise<T>["reject"];

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function getColumn(name: string) {
  return screen.getByRole("region", {
    name,
  });
}

function getTaskCard(title: string) {
  return screen
    .getByRole("heading", {
      name: title,
    })
    .closest("article");
}

function createMovedTaskResponse(
  id: string,
  columnId: string,
  position: number
): TaskResponse {
  return {
    id,
    title: id === "task-1" ? optimisticTaskTitle : draggableTaskTitle,
    description: null,
    priority: "MEDIUM",
    position,
    version: 2,
    columnId,
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:01:00.000Z",
  };
}

function createBoardsAfterConflictingMove(): BoardResponse[] {
  return initialBoards.map(board => ({
    ...board,
    columns: board.columns.map(column => {
      if (column.key === "todo") {
        return {
          ...column,
          tasks: column.tasks.filter(task => task.id !== "task-1"),
        };
      }

      if (column.key === "done") {
        return {
          ...column,
          tasks: [
            ...column.tasks,
            createMovedTaskResponse("task-1", column.id, column.tasks.length),
          ],
        };
      }

      return column;
    }),
  }));
}

async function renderBoard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <KanbanBoard />
    </QueryClientProvider>
  );

  await screen.findByRole("heading", { name: optimisticTaskTitle });

  return { ...result, queryClient };
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    mockedGetBoards.mockReset();
    mockedGetBoards.mockResolvedValue(initialBoards);
    mockedCreateTask.mockReset();
    mockedDeleteTask.mockReset();
    mockedMoveTask.mockReset();
    mockedUpdateTask.mockReset();
  });

  it("creates a task in the selected column", async () => {
    mockedCreateTask.mockResolvedValueOnce({
      id: "task-new",
      title: "Ship portfolio",
      description: null,
      priority: "MEDIUM",
      position: 0,
      version: 1,
      columnId: "column-done",
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    });
    const user = userEvent.setup();

    await renderBoard();

    const doneColumn = getColumn("Done");
    await user.click(
      within(doneColumn).getByRole("button", { name: "Add task to Done" })
    );
    await user.type(
      within(doneColumn).getByLabelText("Task title"),
      "Ship portfolio"
    );
    await user.type(
      within(doneColumn).getByLabelText("Description"),
      "Publish the final case study"
    );
    await user.selectOptions(
      within(doneColumn).getByLabelText("Priority"),
      "HIGH"
    );
    await user.click(
      within(doneColumn).getByRole("button", { name: "Add task" })
    );

    await waitFor(() => {
      expect(mockedCreateTask).toHaveBeenCalledWith(
        {
          title: "Ship portfolio",
          description: "Publish the final case study",
          priority: "HIGH",
          columnId: "column-done",
        },
        "test-token"
      );
    });
  });

  it("edits task details with the current version", async () => {
    mockedUpdateTask.mockResolvedValueOnce({
      ...initialBoards[0]!.columns[0]!.tasks[0]!,
      title: "Updated portfolio task",
      description: "Ready for review",
      priority: "HIGH",
      version: 2,
    });
    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);
    expect(taskCard).not.toBeNull();

    await user.click(within(taskCard!).getByRole("button", { name: "Edit" }));
    const titleInput = within(taskCard!).getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated portfolio task");
    await user.type(
      within(taskCard!).getByLabelText("Description"),
      "Ready for review"
    );
    await user.selectOptions(
      within(taskCard!).getByLabelText("Priority"),
      "HIGH"
    );
    await user.click(
      within(taskCard!).getByRole("button", { name: "Save changes" })
    );

    await waitFor(() => {
      expect(mockedUpdateTask).toHaveBeenCalledWith(
        "task-1",
        {
          title: "Updated portfolio task",
          description: "Ready for review",
          priority: "HIGH",
          expectedVersion: 1,
        },
        "test-token"
      );
    });
  });

  it("requires confirmation before deleting a versioned task", async () => {
    mockedDeleteTask.mockResolvedValueOnce();
    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);
    expect(taskCard).not.toBeNull();

    await user.click(within(taskCard!).getByRole("button", { name: "Delete" }));
    expect(mockedDeleteTask).not.toHaveBeenCalled();
    await user.click(
      within(taskCard!).getByRole("button", { name: "Delete task" })
    );

    await waitFor(() => {
      expect(mockedDeleteTask).toHaveBeenCalledWith(
        "task-1",
        { expectedVersion: 1 },
        "test-token"
      );
    });
  });

  it("moves a task optimistically before the API request completes", async () => {
    const request = createDeferredPromise<TaskResponse>();

    mockedMoveTask.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    expect(
      within(getColumn("In Progress")).getByRole("heading", {
        name: optimisticTaskTitle,
      })
    ).toBeInTheDocument();

    expect(mockedMoveTask).toHaveBeenCalledWith(
      "task-1",
      {
        columnId: "column-progress",
        position: 1,
        expectedVersion: 1,
      },
      "test-token"
    );

    await act(async () => {
      request.resolve(createMovedTaskResponse("task-1", "column-progress", 1));
      await request.promise;
    });
  });

  it("keeps the task in its new column after persistence succeeds", async () => {
    mockedMoveTask.mockResolvedValueOnce(
      createMovedTaskResponse("task-1", "column-progress", 1)
    );

    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    await waitFor(() => {
      expect(
        within(getColumn("In Progress")).getByRole("heading", {
          name: optimisticTaskTitle,
        })
      ).toBeInTheDocument();
    });
  });

  it("drops a task before a specific destination task", async () => {
    mockedMoveTask.mockResolvedValueOnce(
      createMovedTaskResponse("task-1", "column-progress", 0)
    );
    await renderBoard();

    const sourceCard = getTaskCard(optimisticTaskTitle);
    const destinationCard = getTaskCard(draggableTaskTitle);
    const dragData = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      setData: (type: string, value: string) => dragData.set(type, value),
      getData: (type: string) => dragData.get(type) ?? "",
    };

    expect(sourceCard).not.toBeNull();
    expect(destinationCard).not.toBeNull();

    fireEvent.dragStart(sourceCard!, { dataTransfer });
    fireEvent.drop(destinationCard!, { dataTransfer });

    await waitFor(() => {
      expect(mockedMoveTask).toHaveBeenCalledWith(
        "task-1",
        {
          columnId: "column-progress",
          position: 0,
          expectedVersion: 1,
        },
        "test-token"
      );
    });
  });

  it("rolls a task back and displays an inline error when persistence fails", async () => {
    const request = createDeferredPromise<TaskResponse>();

    mockedMoveTask.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    expect(
      within(getColumn("In Progress")).getByRole("heading", {
        name: optimisticTaskTitle,
      })
    ).toBeInTheDocument();

    await act(async () => {
      request.reject(new Error("Request failed"));

      try {
        await request.promise;
      } catch {
        // The application handles the rejected request.
      }
    });

    await waitFor(() => {
      expect(
        within(getColumn("Todo")).getByRole("heading", {
          name: optimisticTaskTitle,
        })
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /unable to update the task status/i
    );
  });

  it("refetches and applies server state after a version conflict", async () => {
    mockedGetBoards
      .mockResolvedValueOnce(initialBoards)
      .mockResolvedValueOnce(createBoardsAfterConflictingMove());
    mockedMoveTask.mockRejectedValueOnce(
      new ApiError("Task has been modified by another client.", 409)
    );
    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    await waitFor(() => {
      expect(
        within(getColumn("Done")).getByRole("heading", {
          name: optimisticTaskTitle,
        })
      ).toBeInTheDocument();
    });

    expect(mockedGetBoards).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /changed elsewhere.*refreshed/i
    );
  });

  it("disables only the task whose request is pending", async () => {
    const request = createDeferredPromise<TaskResponse>();

    mockedMoveTask.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    await renderBoard();

    const firstTask = getTaskCard(optimisticTaskTitle);

    expect(firstTask).not.toBeNull();

    await user.click(
      within(firstTask!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    const pendingTask = getTaskCard(optimisticTaskTitle);
    const unrelatedTask = getTaskCard(draggableTaskTitle);

    expect(pendingTask).not.toBeNull();
    expect(unrelatedTask).not.toBeNull();

    expect(
      within(pendingTask!).getByRole("button", {
        name: "Move to Done",
      })
    ).toBeDisabled();

    expect(
      within(unrelatedTask!).getByRole("button", {
        name: "Move to Done",
      })
    ).toBeEnabled();

    await act(async () => {
      request.resolve(createMovedTaskResponse("task-1", "column-progress", 1));
      await request.promise;
    });
  });

  it("prevents a second mutation for the same pending task", async () => {
    const request = createDeferredPromise<TaskResponse>();

    mockedMoveTask.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    await renderBoard();

    const taskCard = getTaskCard(optimisticTaskTitle);

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    const pendingTask = getTaskCard(optimisticTaskTitle);

    expect(pendingTask).not.toBeNull();

    await user.click(
      within(pendingTask!).getByRole("button", {
        name: "Move to Done",
      })
    );

    expect(mockedMoveTask).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve(createMovedTaskResponse("task-1", "column-progress", 1));
      await request.promise;
    });
  });

  it("allows two different tasks to update concurrently", async () => {
    const firstRequest = createDeferredPromise<TaskResponse>();
    const secondRequest = createDeferredPromise<TaskResponse>();

    mockedMoveTask
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const user = userEvent.setup();

    await renderBoard();

    const firstTask = getTaskCard(optimisticTaskTitle);
    const secondTask = getTaskCard(draggableTaskTitle);

    expect(firstTask).not.toBeNull();
    expect(secondTask).not.toBeNull();

    await user.click(
      within(firstTask!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    await user.click(
      within(secondTask!).getByRole("button", {
        name: "Move to Done",
      })
    );

    expect(mockedMoveTask).toHaveBeenCalledTimes(2);

    expect(
      within(getColumn("In Progress")).getByRole("heading", {
        name: optimisticTaskTitle,
      })
    ).toBeInTheDocument();

    expect(
      within(getColumn("Done")).getByRole("heading", {
        name: draggableTaskTitle,
      })
    ).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve(
        createMovedTaskResponse("task-1", "column-progress", 1)
      );
      secondRequest.resolve(
        createMovedTaskResponse("task-4", "column-done", 0)
      );

      await Promise.all([firstRequest.promise, secondRequest.promise]);
    });
  });
});
