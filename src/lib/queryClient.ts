import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * TanStack Query client. Data is cached long enough that already-loaded
 * orders/customers remain viewable offline (read-only offline mode per PRD).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      gcTime: 1000 * 60 * 60 * 24, // keep in cache 24h for offline reads
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
  },
});

/** Persists the query cache to localStorage so reads survive reloads/offline. */
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "alaqsa-query-cache",
});
