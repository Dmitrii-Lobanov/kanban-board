/// <reference types="jest" />

import type { BoardResponse } from '@kanban-board/contracts';
import { assertBoardInvariants } from './helpers/assert-board-invariants';

function createBoard(): BoardResponse {
  const timestamp = '2026-01-01T00:00:00.000Z';

  return {
    id: 'board-1',
    title: 'Test board',
    position: 0,
    workspaceId: 'workspace-1',
    createdAt: timestamp,
    updatedAt: timestamp,
    members: [],
    columns: [
      {
        id: 'column-1',
        title: 'Todo',
        key: 'todo',
        position: 0,
        boardId: 'board-1',
        createdAt: timestamp,
        updatedAt: timestamp,
        tasks: [0, 1, 2].map(position => ({
          id: `task-${position}`,
          title: `Task ${position}`,
          description: null,
          priority: 'MEDIUM' as const,
          position,
          version: 1,
          columnId: 'column-1',
          createdAt: timestamp,
          updatedAt: timestamp,
          assignee: null,
        })),
      },
    ],
  };
}

describe('board invariant assertions', () => {
  it('accepts a valid board without modifying it', () => {
    const board = createBoard();
    const original = structuredClone(board);

    assertBoardInvariants(board);

    expect(board).toEqual(original);
  });

  it('accepts an empty column', () => {
    const board = createBoard();
    board.columns[0]!.tasks = [];

    expect(() => assertBoardInvariants(board)).not.toThrow();
  });

  it.each([
    ['duplicate positions', [0, 0, 2]],
    ['position gaps', [0, 2, 3]],
    ['negative positions', [-1, 0, 1]],
    ['fractional positions', [0, 1, 1.5]],
  ])('rejects %s', (_label, positions) => {
    const board = createBoard();

    board.columns[0]!.tasks.forEach((task, index) => {
      task.position = positions[index]!;
    });

    expect(() => assertBoardInvariants(board)).toThrow();
  });

  it('rejects a duplicated task identity', () => {
    const board = createBoard();
    board.columns[0]!.tasks[1]!.id = 'task-0';

    expect(() => assertBoardInvariants(board)).toThrow('duplicate task');
  });

  it('rejects an inconsistent task location', () => {
    const board = createBoard();
    board.columns[0]!.tasks[0]!.columnId = 'another-column';

    expect(() => assertBoardInvariants(board)).toThrow(
      'inconsistent column',
    );
  });

  it('rejects a column belonging to another board', () => {
    const board = createBoard();
    board.columns[0]!.boardId = 'another-board';

    expect(() => assertBoardInvariants(board)).toThrow(
      'belongs to another board',
    );
  });

  it('rejects an invalid task version', () => {
    const board = createBoard();
    board.columns[0]!.tasks[0]!.version = 0;

    expect(() => assertBoardInvariants(board)).toThrow('invalid version');
  });
});