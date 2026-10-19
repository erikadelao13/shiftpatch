import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

export function useServerRefresh() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const settle = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (refreshing || !settle.current) return;
    settle.current();
    settle.current = null;
  }, [refreshing]);

  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        settle.current = resolve;
        startRefresh(() => router.refresh());
      }),
    [router],
  );

  return { refresh, refreshing };
}
