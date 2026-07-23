import { ApiError } from "./api-error";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

if (!apiUrl) {
  throw new Error("VITE_API_URL is not configured.");
}

export async function apiRequest(
  path: string,
  init?: RequestInit
): Promise<unknown> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  const payload: unknown = isJson
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}.`;

    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
