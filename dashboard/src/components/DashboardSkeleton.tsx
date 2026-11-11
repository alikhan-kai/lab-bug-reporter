import React from 'react';
import { Bone, SkeletonStyles } from './Skeleton';

const SKELETON_ROWS = 6;

/** Placeholder shaped like the navbar and the report list, shown while the dashboard signs in. */
export const DashboardSkeleton: React.FC = () => (
  <div style={{ minHeight: '100vh', background: '#0f172a' }} aria-busy="true" aria-label="Загрузка">
    <SkeletonStyles />
    <header style={{
      background: '#090d16',
      borderBottom: '1px solid #1e293b',
      padding: '0 28px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Bone width={160} height={28} radius={6} />
        <Bone width={180} height={26} radius={6} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Bone width={96} height={28} />
        <Bone width={32} height={32} radius={16} />
      </div>
    </header>

    <main style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto', display: 'grid', gap: '16px' }}>
      <Bone width={220} height={24} />
      <Bone width="100%" height={36} radius={6} />
      <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index} style={{ display: 'flex', gap: '16px', padding: '14px 16px', borderTop: index ? '1px solid #1e293b' : 'none' }}>
            <Bone width={90} height={14} />
            <Bone width="40%" height={14} />
            <Bone width={70} height={14} />
            <Bone width={120} height={14} />
          </div>
        ))}
      </div>
    </main>
  </div>
);
