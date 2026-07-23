import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTaskStatus } from "../../api/tasks";
import { KanbanBoard } from "./KanbanBoard";

vi.mock("../../api/tasks", () => ({
  updateTaskStatus: vi.fn(),
}));

vi.mock("../../features/boards/hooks/useBoards", () => ({
  useBoards: () => ({
    isPending: false,
    isError: false,
    data: [
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
    ],
  }),
}));

const mockedUpdateTaskStatus = vi.mocked(updateTaskStatus);
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

describe("KanbanBoard", () => {
  beforeEach(() => {
    mockedUpdateTaskStatus.mockReset();
  });

  it("moves a task optimistically before the API request completes", async () => {
    const request = createDeferredPromise<void>();

    mockedUpdateTaskStatus.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

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

    expect(mockedUpdateTaskStatus).toHaveBeenCalledWith(
      "task-1",
      "in-progress"
    );

    await act(async () => {
      request.resolve();
      await request.promise;
    });
  });

  it("keeps the task in its new column after persistence succeeds", async () => {
    mockedUpdateTaskStatus.mockResolvedValueOnce();

    const user = userEvent.setup();

    render(<KanbanBoard />);

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

  it("rolls a task back and displays an inline error when persistence fails", async () => {
    const request = createDeferredPromise<void>();

    mockedUpdateTaskStatus.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

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

  it("disables only the task whose request is pending", async () => {
    const request = createDeferredPromise<void>();

    mockedUpdateTaskStatus.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

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
      request.resolve();
      await request.promise;
    });
  });

  it("prevents a second mutation for the same pending task", async () => {
    const request = createDeferredPromise<void>();

    mockedUpdateTaskStatus.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

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

    expect(mockedUpdateTaskStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve();
      await request.promise;
    });
  });

  it("allows two different tasks to update concurrently", async () => {
    const firstRequest = createDeferredPromise<void>();
    const secondRequest = createDeferredPromise<void>();

    mockedUpdateTaskStatus
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

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

    expect(mockedUpdateTaskStatus).toHaveBeenCalledTimes(2);

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
      firstRequest.resolve();
      secondRequest.resolve();

      await Promise.all([firstRequest.promise, secondRequest.promise]);
    });
  });
});
