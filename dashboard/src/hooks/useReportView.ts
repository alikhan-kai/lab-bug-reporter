import { useEffect, useState } from 'react';
import { api, describeError } from '../api/client';
import type { Attachment, ReportDetail } from '../api/types';
import type { MediaFile, ReportMedia, ReportView } from '../types';

export type ReportViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; report: ReportView };

async function loadReportView(reportId: string): Promise<ReportView> {
  const [detail, context] = await Promise.all([api.fetchReport(reportId), api.fetchReportContext(reportId)]);
  return {
    ...detail,
    // Reports from older SDK versions can miss a list.
    console: context.console ?? [],
    network: context.network ?? [],
    breadcrumbs: context.breadcrumbs ?? [],
  };
}

/** Loads a report with its captured context. `replaceReport` keeps the view in sync after a change. */
export function useReportView(reportId: string): {
  state: ReportViewState;
  replaceReport: (detail: ReportDetail) => void;
} {
  const [state, setState] = useState<ReportViewState>({ status: 'loading' });

  useEffect(() => {
    let isCancelled = false;
    setState({ status: 'loading' });
    loadReportView(reportId)
      .then((report) => {
        if (!isCancelled) setState({ status: 'ready', report });
      })
      .catch((error: unknown) => {
        console.error('Cannot load report', error);
        if (!isCancelled) setState({ status: 'error', message: describeError(error) });
      });
    return () => {
      isCancelled = true;
    };
  }, [reportId]);

  const replaceReport = (detail: ReportDetail) => {
    setState((current) => current.status === 'ready'
      ? { status: 'ready', report: { ...current.report, ...detail } }
      : current);
  };
  return { state, replaceReport };
}

/** Loads the video and the screenshots as blob URLs, each on its own, and frees them when the view closes. */
export function useReportMedia(reportId: string, attachments: Attachment[]): ReportMedia {
  const [video, setVideo] = useState<MediaFile<string | null>>({ status: 'loading', progress: null });
  const [screenshots, setScreenshots] = useState<MediaFile<string[]>>({ status: 'loading', progress: null });
  // A status change returns a new attachments array with the same files; the key keeps them from loading again.
  const attachmentKey = attachments.map((attachment) => `${attachment.kind}:${attachment.id}`).join(',');

  useEffect(() => {
    let isCancelled = false;
    const objectUrls: string[] = [];
    const toObjectUrl = async (attachmentId: string, onProgress?: (percent: number) => void): Promise<string> => {
      const blob = await api.fetchAttachment(reportId, attachmentId, onProgress);
      // The view closed during the download, so nothing would free a URL made now.
      if (isCancelled) return '';
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      return url;
    };

    const files = attachmentKey ? attachmentKey.split(',').map((entry) => entry.split(':')) : [];
    const videoId = files.find(([kind]) => kind === 'video')?.[1];
    const screenshotIds = files.filter(([kind]) => kind === 'screenshot').map(([, id]) => id);

    setVideo(videoId ? { status: 'loading', progress: 0 } : { status: 'ready', value: null });
    if (videoId) {
      toObjectUrl(videoId, (progress) => {
        if (!isCancelled) setVideo({ status: 'loading', progress });
      })
        .then((url) => {
          if (!isCancelled) setVideo({ status: 'ready', value: url });
        })
        .catch((error: unknown) => {
          console.error('Cannot load the video', error);
          if (!isCancelled) setVideo({ status: 'error' });
        });
    }

    setScreenshots({ status: 'loading', progress: null });
    Promise.all(screenshotIds.map((id) => toObjectUrl(id)))
      .then((urls) => {
        if (!isCancelled) setScreenshots({ status: 'ready', value: urls });
      })
      .catch((error: unknown) => {
        console.error('Cannot load the screenshots', error);
        if (!isCancelled) setScreenshots({ status: 'error' });
      });

    return () => {
      isCancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reportId, attachmentKey]);

  return { video, screenshots };
}
