import type {
  CreateTaskRequest,
  MoveTaskRequest,
  TaskResponse,
} from "@kanban-board/contracts";
import { parseTaskResponse } from "./boards";
import { apiRequest } from "./client";

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
