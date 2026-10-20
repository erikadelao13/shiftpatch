import { useState } from "react";

type RefreshableQuery = {
  refetch: () => Promise<{ isError: boolean }>;
  isFetching: boolean;
  isRefetchError: boolean;
  error: Error | null;
};

export function useQueryRefresh(query: RefreshableQuery, successMessage: string) {
  const [announcement, setAnnouncement] = useState("");

  async function refresh() {
    setAnnouncement("");
    const result = await query.refetch();
    if (!result.isError) setAnnouncement(successMessage);
  }

  return {
    announcement,
    refresh,
    refreshing: query.isFetching,
    refreshError: query.isRefetchError ? query.error : null,
  };
}
