import { api } from './client';

export function getBoards() {
  return api('/boards');
}