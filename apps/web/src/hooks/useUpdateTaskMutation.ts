import type { UpdateTaskRequest } from "@kanban-board/contracts";
import { useAuth } from "@clerk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/api-error";
import { updateTask } from "../api/tasks";
import { boardsQueryKey } from "../features/boards/hooks/useBoards";

type UpdateTaskVariables = {
  taskId: string;
  request: UpdateTaskRequest;
};

export function useUpdateTaskMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, request }: UpdateTaskVariables) =>
      updateTask(taskId, request, await getToken()),
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
