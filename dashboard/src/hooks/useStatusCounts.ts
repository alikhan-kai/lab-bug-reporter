import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ReportFilters, ReportStatusCounts } from '../api/types';

/**
 * How many reports have each status under the project, type and search filters. While the counts load or when they
 * fail, it is null: the status switch still works, only without its numbers.
 */
export function useStatusCounts(filters: ReportFilters): { counts: ReportStatusCounts | null; reload: () => void } {
  const [counts, setCounts] = useState<ReportStatusCounts | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const { projects, types, query } = filters;
  // The status filter does not change the counts, so choosing a status does not load them again.
  const countKey = JSON.stringify([projects, types, query]);

  useEffect(() => {
    let isCancelled = false;
    setCounts(null);
    api.fetchStatusCounts({ projects, types, query, statuses: [] })
      .then((loadedCounts) => {
        if (!isCancelled) setCounts(loadedCounts);
      })
      .catch((error: unknown) => console.error('Cannot load the status counts', error));
    return () => {
      isCancelled = true;
    };
    // countKey stands for projects, types and query, which are new arrays on every filter change.
  }, [countKey, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  return { counts, reload };
}
