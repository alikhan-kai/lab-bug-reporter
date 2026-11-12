import React from 'react';
import navbar from './Navbar.module.css';
import list from './ReportList.module.css';
import { Bone } from './Skeleton';
import ui from './ui.module.css';

const SKELETON_ROWS = 6;

/** Placeholder shaped like the navbar and the report list, shown while the dashboard signs in. */
export const DashboardSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading">
    <header className={navbar.header}>
      <div className={navbar.inner}>
        <Bone width={150} height={26} radius={6} />
        <Bone width={70} height={18} />
        <div className={navbar.user}>
          <Bone width={110} height={28} radius={6} />
          <Bone width={32} height={32} radius={6} />
        </div>
      </div>
    </header>
    <main className={ui.page}>
      <div className={list.heading}>
        <Bone width={120} height={26} />
      </div>
      <div className={list.layout}>
        <div className={ui.card}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div key={index} className={list.skeletonRow}>
              <Bone width={16} height={16} />
              <Bone width="45%" height={14} />
              <Bone width={72} height={22} radius={11} />
            </div>
          ))}
        </div>
        <div className={ui.card}>
          <div className={list.filterSection}><Bone width="100%" height={32} radius={6} /></div>
          <div className={list.filterSection}><Bone width="70%" height={80} /></div>
          <div className={list.filterSection}><Bone width="70%" height={60} /></div>
        </div>
      </div>
    </main>
  </div>
);
