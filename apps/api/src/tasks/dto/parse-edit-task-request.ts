import type { EditTaskRequest } from '@kanban-board/contracts';
import { BadRequestException } from '@nestjs/common';
import { TaskPriority } from '@prisma/client';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseEditTaskRequest(body: unknown): EditTaskRequest {
  if (
    !isObject(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'changes') ||
    !isObject(body.changes)
  ) {
    throw new BadRequestException(
      'Expected an object containing only changes.',
    );
  }

  const entries = Object.entries(body.changes);

  if (entries.length === 0) {
    throw new BadRequestException('At least one changed field is required.');
  }

  const changes: EditTaskRequest['changes'] = {};

  for (const [field, change] of entries) {
    if (
      !isObject(change) ||
      Object.keys(change).length !== 2 ||
      !Object.hasOwn(change, 'value') ||
      !Object.hasOwn(change, 'expectedRevision')
    ) {
      throw new BadRequestException(
        `${field} must contain value and expectedRevision.`,
      );
    }

    const { value, expectedRevision } = change;

    if (
      typeof expectedRevision !== 'number' ||
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 1 ||
      expectedRevision > 2_147_483_647
    ) {
      throw new BadRequestException(
        `${field}.expectedRevision must be a positive 32-bit integer.`,
      );
    }

    switch (field) {
      case 'title':
        if (
          typeof value !== 'string' ||
          value.trim().length === 0 ||
          [...value].length > 200
        ) {
          throw new BadRequestException(
            'Title must contain text and be at most 200 characters.',
          );
        }
        changes.title = { value, expectedRevision };
        break;

      case 'description':
        if (
          value !== null &&
          (typeof value !== 'string' || [...value].length > 2000)
        ) {
          throw new BadRequestException(
            'Description must be null or at most 2000 characters.',
          );
        }
        changes.description = { value, expectedRevision };
        break;

      case 'priority':
        if (
          value !== TaskPriority.LOW &&
          value !== TaskPriority.MEDIUM &&
          value !== TaskPriority.HIGH
        ) {
          throw new BadRequestException(
            'Priority must be LOW, MEDIUM, or HIGH.',
          );
        }
        changes.priority = { value, expectedRevision };
        break;

      case 'assigneeId':
        if (
          value !== null &&
          (typeof value !== 'string' || value.trim().length === 0)
        ) {
          throw new BadRequestException(
            'Assignee ID must be null or non-empty.',
          );
        }
        changes.assigneeId = { value, expectedRevision };
        break;

      default:
        throw new BadRequestException(`Unknown editable field: ${field}.`);
    }
  }

  return { changes };
}
