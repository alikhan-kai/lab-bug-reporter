import { useCallback, useEffect, useState } from 'react';

// The open report lives in the address, so a report link can be pasted into the tracker (ТЗ, раздел 14) and the
// browser's back button returns to the list. A query parameter survives the Keycloak login redirect.
const REPORT_PARAMETER = 'report';

function readReportId(): string | null {
  return new URLSearchParams(window.location.search).get(REPORT_PARAMETER);
}

/** The address of a report in the dashboard, for links and for copying. */
export function reportHref(reportId: string): string {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({ [REPORT_PARAMETER]: reportId }).toString();
  url.hash = '';
  return url.toString();
}

function listHref(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(REPORT_PARAMETER);
  url.hash = '';
  return url.toString();
}

/** The report open in the address bar, and functions that open one or return to the list. */
export function useReportRoute(): {
  reportId: string | null;
  openReport: (reportId: string) => void;
  showList: () => void;
} {
  const [reportId, setReportId] = useState<string | null>(readReportId);

  useEffect(() => {
    const syncWithAddress = () => setReportId(readReportId());
    window.addEventListener('popstate', syncWithAddress);
    return () => window.removeEventListener('popstate', syncWithAddress);
  }, []);

  const openReport = useCallback((nextReportId: string) => {
    window.history.pushState(null, '', reportHref(nextReportId));
    setReportId(nextReportId);
  }, []);

  const showList = useCallback(() => {
    if (readReportId() !== null) {
      window.history.pushState(null, '', listHref());
    }
    setReportId(null);
  }, []);

  return { reportId, openReport, showList };
}
