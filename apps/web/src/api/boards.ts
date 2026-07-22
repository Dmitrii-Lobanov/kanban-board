import { apiRequest } from "./client";
import type { BoardDto } from "./boards.types";

export function getBoards(): Promise<BoardDto[]> {
  return apiRequest<BoardDto[]>("/boards");
}
