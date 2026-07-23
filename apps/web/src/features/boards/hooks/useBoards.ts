import { useQuery } from "@tanstack/react-query";
import { getBoards } from "../../../api/boards";

export const boardsQueryKey = ["boards"] as const;

export function useBoards() {
  return useQuery({
    queryKey: boardsQueryKey,
    queryFn: getBoards,
  });
}
