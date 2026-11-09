import React, { useState } from 'react';
import { initialReports } from './mockData';
import { ReportItem, ReportStatus } from './types';
import { Navbar } from './components/Navbar';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';

export const App: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const handleStatusChange = (id: string, newStatus: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleDeleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    setSelectedReportId(null);
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      <Navbar
        currentProject={selectedProject}
        onProjectChange={setSelectedProject}
        onHomeClick={() => setSelectedReportId(null)}
      />

      <main>
        {selectedReport ? (
          <ReportDetail
            report={selectedReport}
            onBack={() => setSelectedReportId(null)}
            onStatusChange={handleStatusChange}
            onDeleteReport={handleDeleteReport}
          />
        ) : (
          <ReportList
            reports={reports}
            onSelectReport={(r) => setSelectedReportId(r.id)}
            selectedProject={selectedProject}
          />
        )}
      </main>
    </div>
  );
};

export default App;
