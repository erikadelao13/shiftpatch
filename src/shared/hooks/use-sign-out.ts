import { useQueryClient } from "@tanstack/react-query";

export function useSignOut(signOutAction: () => Promise<void>) {
  const queryClient = useQueryClient();

  return async function signOut() {
    queryClient.clear();
    await signOutAction();
  };
}
