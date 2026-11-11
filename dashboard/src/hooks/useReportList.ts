import { useCallback, useEffect, useState } from 'react';
import { api, describeError } from '../api/client';
import type { Page, ReportFilters, ReportSummary } from '../api/types';

export type ReportListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; page: Page<ReportSummary> };

/** Loads one page of the report list and loads it again whenever the filters or the page change. */
export function useReportList(filters: ReportFilters, page: number): { state: ReportListState; reload: () => void } {
  const [state, setState] = useState<ReportListState>({ status: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setState({ status: 'loading' });
    api.fetchReports(filters, page)
      .then((reports) => {
        if (!isCancelled) setState({ status: 'ready', page: reports });
      })
      .catch((error: unknown) => {
        console.error('Cannot load reports', error);
        if (!isCancelled) setState({ status: 'error', message: describeError(error) });
      });
    return () => {
      isCancelled = true;
    };
  }, [filters, page, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  return { state, reload };
}
