import React, { useState, useEffect } from 'react';
import { ReportItem, ReportStatus } from './types';
import { apiClient } from './api/client';
import { Navbar } from './components/Navbar';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';

export const App: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<string>('admin');

  // Загрузка пользователя и отчетов через apiClient
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const currentUser = await apiClient.getMe();
        if (currentUser.roles.length > 0) {
          setCurrentRole(currentUser.roles[0]);
        }

        const data = await apiClient.getReports({ project: selectedProject });
        setReports(data);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [selectedProject]);

  const handleStatusChange = async (id: string, newStatus: ReportStatus) => {
    try {
      await apiClient.updateReportStatus(id, newStatus);
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error('Не удалось изменить статус:', err);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await apiClient.deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      setSelectedReportId(null);
    } catch (err) {
      console.error('Не удалось удалить отчет:', err);
    }
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      <Navbar
        currentProject={selectedProject}
        onProjectChange={setSelectedProject}
        onHomeClick={() => setSelectedReportId(null)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
      />

      <main>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Загрузка отчетов из API...
          </div>
        ) : selectedReport ? (
          <ReportDetail
            report={selectedReport}
            currentRole={currentRole}
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
