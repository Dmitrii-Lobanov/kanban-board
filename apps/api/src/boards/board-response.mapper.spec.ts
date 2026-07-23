import { ColumnKey, TaskPriority } from '@prisma/client';

import {
  mapBoardResponse,
  type BoardWithColumnsAndTasks,
} from './board-response.mapper';

describe('mapBoardResponse', () => {
  it.each([
    [ColumnKey.TODO, 'todo'],
    [ColumnKey.IN_PROGRESS, 'in-progress'],
    [ColumnKey.DONE, 'done'],
  ] as const)('maps %s to %s', (key, expectedKey) => {
    const timestamp = new Date('2026-07-23T12:00:00.000Z');
    const board = {
      id: 'board-1',
      title: 'Product Development',
      position: 0,
      workspaceId: 'workspace-1',
      createdAt: timestamp,
      updatedAt: timestamp,
      columns: [
        {
          id: 'column-1',
          title: 'Editable title',
          key,
          position: 0,
          boardId: 'board-1',
          createdAt: timestamp,
          updatedAt: timestamp,
          tasks: [
            {
              id: 'task-1',
              title: 'Task',
              description: null,
              priority: TaskPriority.MEDIUM,
              position: 0,
              version: 1,
              columnId: 'column-1',
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
        },
      ],
    } satisfies BoardWithColumnsAndTasks;

    const response = mapBoardResponse(board);

    expect(response.columns[0]?.key).toBe(expectedKey);
    expect(response.createdAt).toBe(timestamp.toISOString());
    expect(response.columns[0]?.tasks[0]?.priority).toBe('MEDIUM');
  });
});
