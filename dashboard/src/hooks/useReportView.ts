import { useEffect, useState } from 'react';
import { api, describeError } from '../api/client';
import type { Attachment, ReportDetail } from '../api/types';
import type { ReportMedia, ReportView } from '../types';

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

/** Loads the screenshots and the video as blob URLs and frees them when the view closes. */
export function useReportMedia(reportId: string, attachments: Attachment[]): ReportMedia {
  const [media, setMedia] = useState<ReportMedia>({ status: 'loading' });
  // A status change returns a new attachments array with the same files; the key keeps them from loading again.
  const attachmentKey = attachments.map((attachment) => `${attachment.kind}:${attachment.id}`).join(',');

  useEffect(() => {
    let isCancelled = false;
    const objectUrls: string[] = [];
    const toObjectUrl = async (attachmentId: string): Promise<string> => {
      const blob = await api.fetchAttachment(reportId, attachmentId);
      if (isCancelled) return '';
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      return url;
    };

    const files = attachmentKey ? attachmentKey.split(',').map((entry) => entry.split(':')) : [];
    const videoId = files.find(([kind]) => kind === 'video')?.[1];
    const screenshotIds = files.filter(([kind]) => kind === 'screenshot').map(([, id]) => id);

    setMedia({ status: 'loading' });
    Promise.all([videoId ? toObjectUrl(videoId) : Promise.resolve(null), Promise.all(screenshotIds.map(toObjectUrl))])
      .then(([videoUrl, screenshotUrls]) => {
        if (!isCancelled) setMedia({ status: 'ready', videoUrl, screenshotUrls });
      })
      .catch((error: unknown) => {
        console.error('Cannot load report files', error);
        if (!isCancelled) setMedia({ status: 'error' });
      });

    return () => {
      isCancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reportId, attachmentKey]);

  return media;
}
