import { apiRequest } from "./client";
import type { BoardDto, ColumnDto, ColumnKey, TaskDto } from "./boards.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  if (typeof value !== "string") {
    throw new Error(`Invalid boards response: ${field} must be a string.`);
  }

  return value;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];

  if (typeof value !== "number") {
    throw new Error(`Invalid boards response: ${field} must be a number.`);
  }

  return value;
}

function parseColumnKey(value: unknown): ColumnKey {
  switch (value) {
    case "todo":
    case "in-progress":
    case "done":
      return value;
    default:
      throw new Error("Invalid boards response: unsupported column key.");
  }
}

function parsePriority(value: unknown): TaskDto["priority"] {
  switch (value) {
    case "LOW":
    case "MEDIUM":
    case "HIGH":
      return value;
    default:
      throw new Error("Invalid boards response: unsupported task priority.");
  }
}

export function parseTaskResponse(value: unknown): TaskDto {
  if (!isRecord(value)) {
    throw new Error("Invalid boards response: task must be an object.");
  }

  const description = value.description;

  if (description !== null && typeof description !== "string") {
    throw new Error(
      "Invalid boards response: description must be a string or null."
    );
  }

  return {
    id: readString(value, "id"),
    title: readString(value, "title"),
    description,
    priority: parsePriority(value.priority),
    position: readNumber(value, "position"),
    version: readNumber(value, "version"),
    columnId: readString(value, "columnId"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt"),
  };
}

function parseColumn(value: unknown): ColumnDto {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    throw new Error("Invalid boards response: column must contain tasks.");
  }

  return {
    id: readString(value, "id"),
    title: readString(value, "title"),
    key: parseColumnKey(value.key),
    position: readNumber(value, "position"),
    boardId: readString(value, "boardId"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt"),
    tasks: value.tasks.map(parseTaskResponse),
  };
}

function parseBoard(value: unknown): BoardDto {
  if (!isRecord(value) || !Array.isArray(value.columns)) {
    throw new Error("Invalid boards response: board must contain columns.");
  }

  return {
    id: readString(value, "id"),
    title: readString(value, "title"),
    position: readNumber(value, "position"),
    workspaceId: readString(value, "workspaceId"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt"),
    columns: value.columns.map(parseColumn),
  };
}

export async function getBoards(): Promise<BoardDto[]> {
  const response = await apiRequest("/boards");

  if (!Array.isArray(response)) {
    throw new Error("Invalid boards response: expected an array.");
  }

  return response.map(parseBoard);
}
