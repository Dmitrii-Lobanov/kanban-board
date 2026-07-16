import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTaskStatus } from "../../api/tasks";
import { KanbanBoard } from "./KanbanBoard";

vi.mock("../../api/tasks", () => ({
  updateTaskStatus: vi.fn(),
}));

const mockedUpdateTaskStatus = vi.mocked(updateTaskStatus);

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

    const taskCard = getTaskCard("Implement optimistic updates");

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    expect(
      within(getColumn("In Progress")).getByRole("heading", {
        name: "Implement optimistic updates",
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

    const taskCard = getTaskCard("Implement optimistic updates");

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    await waitFor(() => {
      expect(
        within(getColumn("In Progress")).getByRole("heading", {
          name: "Implement optimistic updates",
        })
      ).toBeInTheDocument();
    });
  });

  it("rolls a task back and displays an inline error when persistence fails", async () => {
    const request = createDeferredPromise<void>();

    mockedUpdateTaskStatus.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

    const taskCard = getTaskCard("Implement optimistic updates");

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    expect(
      within(getColumn("In Progress")).getByRole("heading", {
        name: "Implement optimistic updates",
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
          name: "Implement optimistic updates",
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("alert", {
        name: /unable to update the task status/i,
      })
    ).toBeInTheDocument();
  });

  it("disables only the task whose request is pending", async () => {
    const request = createDeferredPromise<void>();

    mockedUpdateTaskStatus.mockReturnValueOnce(request.promise);

    const user = userEvent.setup();

    render(<KanbanBoard />);

    const firstTask = getTaskCard("Implement optimistic updates");

    expect(firstTask).not.toBeNull();

    await user.click(
      within(firstTask!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    const pendingTask = getTaskCard("Implement optimistic updates");
    const unrelatedTask = getTaskCard("Build native drag-and-drop");

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

    const taskCard = getTaskCard("Implement optimistic updates");

    expect(taskCard).not.toBeNull();

    await user.click(
      within(taskCard!).getByRole("button", {
        name: "Move to In Progress",
      })
    );

    const pendingTask = getTaskCard("Implement optimistic updates");

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

    const firstTask = getTaskCard("Implement optimistic updates");
    const secondTask = getTaskCard("Build native drag-and-drop");

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
        name: "Implement optimistic updates",
      })
    ).toBeInTheDocument();

    expect(
      within(getColumn("Done")).getByRole("heading", {
        name: "Build native drag-and-drop",
      })
    ).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve();
      secondRequest.resolve();

      await Promise.all([firstRequest.promise, secondRequest.promise]);
    });
  });
});
