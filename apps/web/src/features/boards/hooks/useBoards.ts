import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { getBoards } from "../../../api/boards";

export const boardsQueryKey = ["boards"] as const;

export function useBoards() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: boardsQueryKey,
    queryFn: async () => getBoards(await getToken()),
    enabled: isLoaded && isSignedIn,
  });
}
