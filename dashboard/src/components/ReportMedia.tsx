import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { ReportMedia } from '../types';
import styles from './ReportDetail.module.css';
import { Bone } from './Skeleton';
import ui from './ui.module.css';

interface VideoPlayerProps {
  video: ReportMedia['video'];
  hasVideo: boolean;
  canSeek: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
}

/**
 * MediaRecorder writes WebM without a duration, so the player shows no timeline until it has read to the end.
 * Seeking far past the end makes it find the real duration; it then goes back to the start.
 */
function revealDuration(video: HTMLVideoElement): void {
  if (video.duration !== Infinity) return;
  const returnToStart = () => {
    if (!Number.isFinite(video.duration)) return;
    video.removeEventListener('durationchange', returnToStart);
    video.currentTime = 0;
  };
  video.addEventListener('durationchange', returnToStart);
  video.currentTime = Number.MAX_SAFE_INTEGER;
}

/** The screen recording, with its download progress while the file loads. */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, hasVideo, canSeek, videoRef, onTimeUpdate }) => {
  if (!hasVideo) {
    return <div className={styles.mediaMessage}>Видеозаписи нет</div>;
  }
  if (video.status === 'error') {
    return <div role="alert" className={styles.mediaError}>Не удалось загрузить видео</div>;
  }
  if (video.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Загрузка видео" className={styles.videoLoading}>
        <Bone width="100%" height={280} radius={8} />
        {video.progress !== null && <span className={styles.videoProgress}>Загрузка видео: {video.progress}%</span>}
      </div>
    );
  }
  return (
    <>
      <video
        ref={videoRef}
        className={styles.video}
        src={video.value ?? undefined}
        controls
        onLoadedMetadata={(event) => revealDuration(event.currentTarget)}
        onTimeUpdate={onTimeUpdate}
      />
      {canSeek && <p className={styles.hint}>Клик по событию в логах перематывает видео к этому моменту.</p>}
    </>
  );
};

/** Screenshot thumbnails; a click opens one full size. */
export const ScreenshotGallery: React.FC<{ screenshots: ReportMedia['screenshots'] }> = ({ screenshots }) => {
  const [enlargedUrl, setEnlargedUrl] = useState<string | null>(null);

  if (screenshots.status === 'ready' && screenshots.value.length === 0) {
    return null;
  }
  return (
    <div className={styles.gallery}>
      <p className={ui.sectionLabel}>
        Скриншоты{screenshots.status === 'ready' ? ` · ${screenshots.value.length}` : ''}
      </p>
      {screenshots.status === 'loading' && (
        <div aria-busy="true" aria-label="Загрузка скриншотов" className={styles.thumbnails}>
          <Bone width={160} height={90} radius={8} />
          <Bone width={160} height={90} radius={8} />
        </div>
      )}
      {screenshots.status === 'error' && <p role="alert" className={ui.errorMessage}>Не удалось загрузить скриншоты</p>}
      {screenshots.status === 'ready' && (
        <div className={styles.thumbnails}>
          {screenshots.value.map((url, index) => (
            <button
              key={url}
              type="button"
              className={styles.thumbnail}
              aria-label={`Открыть скриншот ${index + 1}`}
              onClick={() => setEnlargedUrl(url)}
            >
              <img src={url} alt={`Скриншот ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
      {enlargedUrl && <Lightbox url={enlargedUrl} onClose={() => setEnlargedUrl(null)} />}
    </div>
  );
};

const Lightbox: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Скриншот" className={styles.lightbox} onClick={onClose}>
      <button type="button" className={`${ui.button} ${styles.lightboxClose}`} onClick={onClose} autoFocus>
        <X size={16} aria-hidden="true" />
        Закрыть
      </button>
      <img src={url} alt="Скриншот" />
    </div>
  );
};
