import type { BoardResponse } from '@kanban-board/contracts';

export function assertBoardInvariants(board: BoardResponse): void {
  const columnIds = new Set<string>();
  const taskIds = new Set<string>();

  function requireInvariant(
    condition: boolean,
    message: string,
  ): asserts condition {
    if (!condition) {
      throw new Error(`Board ${board.id}: ${message}`);
    }
  }

  for (const column of board.columns) {
    requireInvariant(
      !columnIds.has(column.id),
      `duplicate column ${column.id}`,
    );
    columnIds.add(column.id);

    requireInvariant(
      column.boardId === board.id,
      `column ${column.id} belongs to another board`,
    );

    const positions: number[] = [];

    for (const task of column.tasks) {
      requireInvariant(!taskIds.has(task.id), `duplicate task ${task.id}`);
      taskIds.add(task.id);

      requireInvariant(
        task.columnId === column.id,
        `task ${task.id} has an inconsistent column`,
      );

      requireInvariant(
        Number.isInteger(task.position) && task.position >= 0,
        `task ${task.id} has invalid position ${task.position}`,
      );

      requireInvariant(
        Number.isInteger(task.version) && task.version >= 1,
        `task ${task.id} has invalid version ${task.version}`,
      );

      positions.push(task.position);
    }

    positions.sort((a, b) => a - b);

    requireInvariant(
      positions.every((position, index) => position === index),
      `column ${column.id} positions must be unique and contiguous from zero`,
    );
  }
}
