import { BadRequestException } from '@nestjs/common';

import { parseEditTaskRequest } from './parse-edit-task-request';

describe('parseEditTaskRequest', () => {
  it('preserves explicit clears and omitted fields', () => {
    const request = {
      changes: {
        description: { value: null, expectedRevision: 2 },
        assigneeId: { value: null, expectedRevision: 3 },
      },
    };

    expect(parseEditTaskRequest(request)).toStrictEqual(request);
  });

  it('accepts a priority-only edit', () => {
    const request = {
      changes: { priority: { value: 'HIGH', expectedRevision: 1 } },
    };

    expect(parseEditTaskRequest(request)).toStrictEqual(request);
  });

  it.each([
    ['an empty patch', { changes: {} }],
    ['an array of changes', { changes: [] }],
    [
      'an unknown field',
      { changes: { position: { value: 1, expectedRevision: 1 } } },
    ],
    ['a missing value', { changes: { description: { expectedRevision: 1 } } }],
    ['a null change envelope', { changes: { description: null } }],
    [
      'a null title',
      { changes: { title: { value: null, expectedRevision: 1 } } },
    ],
    [
      'a blank title',
      { changes: { title: { value: ' ', expectedRevision: 1 } } },
    ],
    [
      'an invalid priority',
      { changes: { priority: { value: 'URGENT', expectedRevision: 1 } } },
    ],
    [
      'a string revision',
      { changes: { priority: { value: 'HIGH', expectedRevision: '1' } } },
    ],
    [
      'a zero revision',
      { changes: { priority: { value: 'HIGH', expectedRevision: 0 } } },
    ],
    [
      'an extra key',
      {
        changes: {
          title: { value: 'Ready', expectedRevision: 1, extra: true },
        },
      },
    ],
  ])('rejects %s', (_label, body) => {
    expect(() => parseEditTaskRequest(body)).toThrow(BadRequestException);
  });
});
