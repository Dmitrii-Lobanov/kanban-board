import { describe, expect, it, vi } from "vitest";

import { apiRequest } from "./client";

describe("apiRequest", () => {
  it("does not declare an empty DELETE request as JSON", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest(
      "/tasks/task-1?expectedVersion=1",
      { method: "DELETE" },
      "test-token"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/tasks/task-1?expectedVersion=1",
      {
        method: "DELETE",
        headers: { Authorization: "Bearer test-token" },
      }
    );
  });

  it("sets JSON content type when a request has a body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Task" }),
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Task" }),
      headers: { "Content-Type": "application/json" },
    });
  });
});
