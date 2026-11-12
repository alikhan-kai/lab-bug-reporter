import React from 'react';

const shimmerKeyframes = `
@keyframes dashboard-skeleton-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}`;

/** The shimmer animation. Render it once in every view that shows bones. */
export const SkeletonStyles: React.FC = () => <style>{shimmerKeyframes}</style>;

/** A placeholder block shaped like the content that is loading. */
export const Bone: React.FC<{ width: string | number; height: number; radius?: number }> = ({ width, height, radius = 4 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--color-line) 0%, var(--color-line) 50%, var(--color-line) 100%)',
      backgroundSize: '800px 100%',
      animation: 'dashboard-skeleton-shimmer 1.4s linear infinite',
    }}
  />
);
