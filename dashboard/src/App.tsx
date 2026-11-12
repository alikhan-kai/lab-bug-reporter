import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportFilters } from './api/types';
import { Navbar } from './components/Navbar';
import { ReportDetailPage } from './components/ReportDetailPage';
import { ReportList } from './components/ReportList';
import { useReportList } from './hooks/useReportList';
import { useReportRoute } from './hooks/useReportRoute';

// The team starts from the reports nobody has looked at yet (ТЗ, раздел 10).
const DEFAULT_FILTERS: ReportFilters = { projects: [], statuses: ['new'], types: [], query: '' };

export const App: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const { reportId, openReport, showList } = useReportRoute();
  const { state: listState, reload } = useReportList(filters, page);

  const changeFilters = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  // A delete or a status change can empty the last page; the list then moves to the page that is now last.
  useEffect(() => {
    if (listState.status === 'ready' && listState.page.content.length === 0 && page > 0) {
      setPage(Math.max(0, listState.page.totalPages - 1));
    }
  }, [listState, page]);

  // A status change or a delete in the detail view changes the list, so it loads again on the way back,
  // also when the way back is the browser's back button.
  const previousReportId = useRef(reportId);
  useEffect(() => {
    if (previousReportId.current !== null && reportId === null) {
      reload();
    }
    previousReportId.current = reportId;
  }, [reportId, reload]);

  return (
    <>
      <Navbar onHomeClick={() => (reportId ? showList() : reload())} />

      <main>
        {reportId ? (
          <ReportDetailPage key={reportId} reportId={reportId} onBack={showList} onDeleted={showList} />
        ) : (
          <ReportList
            state={listState}
            filters={filters}
            onFiltersChange={changeFilters}
            onPageChange={setPage}
            onRetry={reload}
            onSelectReport={openReport}
          />
        )}
      </main>
    </>
  );
};

export default App;
