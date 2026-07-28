import type {
  CreateTaskRequest,
  DeleteTaskRequest,
  MoveTaskRequest,
  TaskResponse,
  UpdateTaskRequest,
} from "@kanban-board/contracts";
import { parseTaskResponse } from "./boards";
import { apiRequest } from "./client";

export async function deleteTask(
  taskId: string,
  request: DeleteTaskRequest,
  token?: string | null
): Promise<void> {
  const query = new URLSearchParams({
    expectedVersion: String(request.expectedVersion),
  });

  await apiRequest(`/tasks/${taskId}?${query}`, { method: "DELETE" }, token);
}

export async function createTask(
  request: CreateTaskRequest,
  token?: string | null
): Promise<TaskResponse> {
  const response = await apiRequest(
    "/tasks",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    token
  );

  return parseTaskResponse(response);
}

export async function moveTask(
  taskId: string,
  request: MoveTaskRequest,
  token?: string | null
): Promise<TaskResponse> {
  const response = await apiRequest(
    `/tasks/${taskId}/position`,
    {
      method: "PATCH",
      body: JSON.stringify(request),
    },
    token
  );

  return parseTaskResponse(response);
}

export async function updateTask(
  taskId: string,
  request: UpdateTaskRequest,
  token?: string | null
): Promise<TaskResponse> {
  const response = await apiRequest(
    `/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(request),
    },
    token
  );

  return parseTaskResponse(response);
}
