import type { CreateTaskRequest } from "@kanban-board/contracts";
import { useAuth } from "@clerk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTask } from "../api/tasks";
import { boardsQueryKey } from "../features/boards/hooks/useBoards";

export function useCreateTaskMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateTaskRequest) =>
      createTask(request, await getToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: boardsQueryKey });
    },
  });
}
