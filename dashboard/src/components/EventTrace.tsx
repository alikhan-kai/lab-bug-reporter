import React from 'react';
import type { Trace, TraceMarkKind } from '../report/trace';
import styles from './EventTrace.module.css';

const LEGEND: { kind: TraceMarkKind; label: string }[] = [
  { kind: 'error', label: 'Console error' },
  { kind: 'failed', label: 'Failed request' },
  { kind: 'click', label: 'Click' },
  { kind: 'navigation', label: 'Page change' },
];

interface EventTraceProps {
  trace: Trace;
  /** Seconds into the video; the playhead is drawn only while there is a video to play. */
  currentTime: number | null;
  canSeek: boolean;
  onSeek: (offsetSeconds: number) => void;
}

/**
 * The report's events on one line under the video, so the moment an error happened is visible at a glance.
 * A click on the line moves the video there. The log entries do the same from the keyboard, so the line itself
 * is left out of the accessibility tree.
 */
export const EventTrace: React.FC<EventTraceProps> = ({ trace, currentTime, canSeek, onSeek }) => {
  const span = trace.end - trace.start;
  const playhead = currentTime === null ? null : ((currentTime - trace.start) / span) * 100;

  const seekTo = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - bounds.left) / bounds.width;
    onSeek(trace.start + fraction * span);
  };

  return (
    <div className={styles.trace}>
      <div aria-hidden="true" className={canSeek ? styles.barSeekable : styles.bar} onClick={canSeek ? seekTo : undefined}>
        {trace.recordingStart > 0 && <span className={styles.beforeRecording} style={{ width: `${trace.recordingStart}%` }} />}
        <span className={styles.baseline} />
        {trace.marks.map((mark, index) => (
          <span key={index} className={`${styles.mark} ${styles[mark.kind]}`} style={{ left: `${mark.position}%` }} title={mark.label} />
        ))}
        {playhead !== null && playhead >= 0 && playhead <= 100 && <span className={styles.playhead} style={{ left: `${playhead}%` }} />}
        {trace.axis.map((label) => (
          <span key={label.label} className={styles.axisLabel} style={{ left: `${label.position}%` }}>{label.label}</span>
        ))}
      </div>
      <ul className={styles.legend} aria-label="Legend">
        {LEGEND.map((item) => (
          <li key={item.kind}><span className={`${styles.legendMark} ${styles[item.kind]}`} aria-hidden="true" />{item.label}</li>
        ))}
        {trace.recordingStart > 0 && (
          <li><span className={styles.legendBefore} aria-hidden="true" />Before the recording</li>
        )}
      </ul>
    </div>
  );
};
