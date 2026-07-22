export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  version: number;
  columnId: string;
  createdAt: string;
  updatedAt: string;
};

export type ColumnDto = {
  id: string;
  title: string;
  position: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  tasks: TaskDto[];
};

export type BoardDto = {
  id: string;
  title: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  columns: ColumnDto[];
};
