import type { Task, TaskStatus } from "../domain/task";

interface BoardTaskResponse {
  id: string;
  title: string;
  position: number;
  version: number;
}

interface BoardColumnResponse {
  id: string;
  title: string;
  position: number;
  tasks: BoardTaskResponse[];
}

interface BoardResponse {
  id: string;
  title: string;
  position: number;
  columns: BoardColumnResponse[];
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const statusByColumnPosition: Record<number, TaskStatus> = {
  0: "todo",
  1: "in-progress",
  2: "done",
};

function mapBoardTasks(board: BoardResponse): Task[] {
  return board.columns.flatMap(column => {
    const status = statusByColumnPosition[column.position];

    if (!status) {
      return [];
    }

    return column.tasks.map(task => ({
      id: task.id,
      title: task.title,
      assignee: "Unassigned",
      status,
    }));
  });
}

export async function getInitialTasks(): Promise<Task[]> {
  const response = await fetch(`${API_URL}/boards`);

  if (!response.ok) {
    throw new Error(`Unable to load boards: ${response.status}`);
  }

  const boards = (await response.json()) as BoardResponse[];
  const board = boards[0];

  return board ? mapBoardTasks(board) : [];
}