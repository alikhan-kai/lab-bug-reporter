import React, { useCallback, useState } from 'react';
import type { ReportFilters } from './api/types';
import { Navbar } from './components/Navbar';
import { ReportDetailPage } from './components/ReportDetailPage';
import { ReportList } from './components/ReportList';
import { useReportList } from './hooks/useReportList';

// The team starts from the reports nobody has looked at yet (ТЗ, раздел 10).
const DEFAULT_FILTERS: ReportFilters = { project: null, status: 'new', type: null, query: '' };
const ALL_PROJECTS = 'all';

export const App: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const { state: listState, reload } = useReportList(filters, page);

  const changeFilters = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  // A status change or a delete in the detail view changes the list, so it loads again on the way back.
  const showList = () => {
    setSelectedReportId(null);
    reload();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      <Navbar
        currentProject={filters.project ?? ALL_PROJECTS}
        onProjectChange={(project) => {
          changeFilters({ ...filters, project: project === ALL_PROJECTS ? null : project });
          setSelectedReportId(null);
        }}
        onHomeClick={showList}
      />

      <main>
        {selectedReportId ? (
          <ReportDetailPage reportId={selectedReportId} onBack={showList} onDeleted={showList} />
        ) : (
          <ReportList
            state={listState}
            filters={filters}
            onFiltersChange={changeFilters}
            onPageChange={setPage}
            onRetry={reload}
            onSelectReport={setSelectedReportId}
          />
        )}
      </main>
    </div>
  );
};

export default App;
