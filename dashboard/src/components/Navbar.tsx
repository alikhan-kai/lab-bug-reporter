import React from 'react';

interface NavbarProps {
  currentProject: string;
  onProjectChange: (project: string) => void;
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentProject, onProjectChange, onHomeClick }) => {
  return (
    <header style={{
      background: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div 
          onClick={onHomeClick}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            background: '#0284c7',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '16px',
            color: 'white'
          }}>
            L
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc' }}>Lab Bug Reporter</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>SDU University AI Lab</span>
          </div>
        </div>

        {/* Фильтр проектов */}
        <select
          value={currentProject}
          onChange={(e) => onProjectChange(e.target.value)}
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#cbd5e1',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">Все проекты лаборатории</option>
          <option value="sdu-portal">SDU Student Portal</option>
          <option value="sdu-library">SDU Library System</option>
        </select>
      </div>

      {/* Пользователь команды (Keycloak User) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'block' }}>Асылбек Сабыржан</span>
          <span style={{
            fontSize: '11px',
            background: '#0369a1',
            color: '#e0f2fe',
            padding: '1px 6px',
            borderRadius: '4px',
            fontWeight: 700
          }}>ADMIN</span>
        </div>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#0284c7',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '14px'
        }}>
          АС
        </div>
      </div>
    </header>
  );
};
