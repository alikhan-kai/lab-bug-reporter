/** The service answered the submit with an error status. `status` is 0 when the request did not reach it. */
export class SubmitError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'SubmitError';
  }
}

/**
 * Posts the report form and reports the upload progress in percent. It uses XMLHttpRequest because fetch cannot
 * report upload progress. The network capture skips the ingest URL, so this request stays out of the report.
 */
export function postReport(url: string, form: FormData, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.responseType = 'text';

    request.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new SubmitError(request.status, readErrorMessage(request)));
        return;
      }
      const reportId = readReportId(request.responseText);
      if (reportId) {
        resolve(reportId);
      } else {
        reject(new SubmitError(request.status, 'The service did not return a report id'));
      }
    };
    request.onerror = () => reject(new SubmitError(0, 'The service cannot be reached'));
    request.onabort = () => reject(new SubmitError(0, 'The upload was cancelled'));

    request.send(form);
  });
}

function readReportId(body: string): string | null {
  try {
    const reportId = (JSON.parse(body) as { reportId?: unknown }).reportId;
    return typeof reportId === 'string' && reportId ? reportId : null;
  } catch {
    return null;
  }
}

// The service answers errors as { status, error, message }; a proxy in front of it may answer with plain text.
function readErrorMessage(request: XMLHttpRequest): string {
  try {
    const message = (JSON.parse(request.responseText) as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  } catch {
    // Not the service's JSON; fall back to the status line.
  }
  return `${request.status} ${request.statusText}`.trim();
}
