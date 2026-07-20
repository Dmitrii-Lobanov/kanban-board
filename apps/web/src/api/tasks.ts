import type { TaskStatus } from "../domain/task";

const wait = (duration: number): Promise<void> =>
  new Promise(resolve => {
    window.setTimeout(resolve, duration);
  });

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<void> {
  await wait(800 + Math.random() * 700);

  // These values would be sent in a real HTTP request.
  void taskId;
  void status;

  if (Math.random() < 0.25) {
    throw new Error("Unable to update the task status.");
  }
}
