import React from 'react';
import styles from './Skeleton.module.css';

/** A placeholder block shaped like the content that is loading. */
export const Bone: React.FC<{ width: string | number; height: number; radius?: number }> = ({ width, height, radius = 4 }) => (
  <span className={styles.bone} style={{ width, height, borderRadius: radius }} />
);
