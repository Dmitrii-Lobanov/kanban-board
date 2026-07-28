import type { DeleteTaskRequest } from "@kanban-board/contracts";
import { useAuth } from "@clerk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/api-error";
import { deleteTask } from "../api/tasks";
import { boardsQueryKey } from "../features/boards/hooks/useBoards";

type DeleteTaskVariables = {
  taskId: string;
  request: DeleteTaskRequest;
};

export function useDeleteTaskMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, request }: DeleteTaskVariables) =>
      deleteTask(taskId, request, await getToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: boardsQueryKey });
    },
    onError: async error => {
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: boardsQueryKey });
      }
    },
  });
}
