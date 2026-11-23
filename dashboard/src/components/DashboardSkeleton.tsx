import React from 'react';
import navbar from './Navbar.module.css';
import list from './ReportList.module.css';
import { SkeletonGroup } from './ReportList';
import { Bone } from './Skeleton';
import ui from './ui.module.css';

const STATUS_PLACEHOLDERS = 5;

/** Placeholder shaped like the top bar and the report list, shown while the dashboard signs in. */
export const DashboardSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading">
    <header className={navbar.header}>
      <div className={navbar.inner}>
        <Bone width={150} height={22} radius={6} />
        <Bone width={70} height={14} />
        <div className={navbar.user}>
          <Bone width={70} height={28} radius={6} />
          <Bone width={70} height={34} radius={17} />
        </div>
      </div>
    </header>
    <main className={ui.page}>
      <Bone width={200} height={44} radius={8} />
      <div className={list.statusSwitch}>
        {Array.from({ length: STATUS_PLACEHOLDERS }, (_, index) => (
          <div key={index} className={list.countLabel}>
            <Bone width={96} height={52} radius={6} />
          </div>
        ))}
      </div>
      <div className={list.filterBar}>
        <Bone width={260} height={18} />
        <div className={list.search}><Bone width="100%" height={14} /></div>
      </div>
      <SkeletonGroup />
    </main>
  </div>
);
