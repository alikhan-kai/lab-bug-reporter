import { ConsoleCapture, ConsoleEntry } from './core/console';
import { NetworkCapture, NetworkEntry } from './core/network';
import { BreadcrumbsCapture, BreadcrumbEntry } from './core/breadcrumbs';
import { captureEnvironment, EnvironmentInfo } from './core/environment';
import { ScreenRecorder, RecordingResult } from './core/capture/recorder';
import { postReport } from './core/upload';
import { SCRIPT_URL } from './core/script-url';
import { captureScreenFrame } from './core/capture/screenshot';
import { BugReporterWidget, ReportFormData, WidgetTheme } from './widget/widget';
import { SupportedLang } from './core/i18n';
import {
  components,
  HelpButton,
  TypeSelector,
  ReportForm,
  ScreenshotButton,
  RecordButton,
  AttachmentList,
  SubmitBar
} from './widget/components';

export interface InitOptions {
  projectKey: string;
  widget?: boolean;
  appVersion?: string;
  /** The reporter service. By default, the address sdk.js was loaded from. */
  apiUrl?: string;
  lang?: SupportedLang;
  /** Logs what the SDK does to the page's console. Off by default, because the logs hold the reporter's data. */
  debug?: boolean;
  /** The widget's colours: light (the default), dark, or system to follow the visitor's system setting. */
  theme?: WidgetTheme;
  /** Max recording duration in seconds (configurable, default: 300 / 5 minutes). */
  maxRecordingSeconds?: number;
}

// The service serves sdk.js itself, so the script's own address is the default service address.
const SCRIPT_ORIGIN = SCRIPT_URL ? new URL(SCRIPT_URL).origin : undefined;

export interface UserIdentity {
  id?: string;
  email?: string;
  [key: string]: any;
}

export interface SubmitPayload {
  type: 'bug' | 'feature' | 'question';
  title: string;
  description?: string;
  attachments?: {
    screenshot?: Blob | Blob[];
    video?: Blob;
    /** Needed for a video made outside the SDK. A video from stopRecording() carries its own. */
    videoDurationMs?: number;
    recordingStartTime?: number;
  };
}

export interface CapturedContext {
  environment: EnvironmentInfo;
  console: ConsoleEntry[];
  network: NetworkEntry[];
  breadcrumbs: BreadcrumbEntry[];
  host_metadata: Record<string, any>;
  reporter: UserIdentity | null;
  recording_start_time?: number;
}

class LabBugReporter {
  private projectKey: string = '';
  private options: InitOptions | null = null;
  private user: UserIdentity | null = null;
  private hostMetadata: Record<string, any> = {};

  // Ядра сбора данных
  private consoleCapture = new ConsoleCapture(500);
  private networkCapture = new NetworkCapture(200);
  private breadcrumbsCapture = new BreadcrumbsCapture(100);

  // Медиа захват
  private recorder = new ScreenRecorder();
  private lastRecording: RecordingResult | null = null;

  // Виджет UI
  private widget: BugReporterWidget | null = null;

  // Prebuilt components kit (по ТЗ раздел 9)
  public components = components;
  public createHelpButton = components.createHelpButton;
  public createTypeSelector = components.createTypeSelector;
  public createReportForm = components.createReportForm;
  public createScreenshotButton = components.createScreenshotButton;
  public createRecordButton = components.createRecordButton;
  public createAttachmentList = components.createAttachmentList;
  public createSubmitBar = components.createSubmitBar;

  constructor() {
    this.consoleCapture.install();
    this.networkCapture.install();
    this.breadcrumbsCapture.install();
    this.recorder.onAutoStop((result) => {
      this.lastRecording = result;
      this.widget?.showStoppedRecording(result);
    });
  }

  init(options: InitOptions): void {
    this.options = options;
    this.projectKey = options.projectKey;
    if (options.appVersion) {
      this.hostMetadata['app_version'] = options.appVersion;
    }
    // Without a known address the default ingest path still keeps the SDK's own upload out of the log.
    const ingestUrl = this.findIngestUrl();
    if (ingestUrl) {
      this.networkCapture.setIngestEndpoint(ingestUrl);
    }

    if (options.widget !== false && typeof document !== 'undefined') {
      this.setupWidget(options.lang, options.theme, options.maxRecordingSeconds);
    }

    this.debugLog('Initialized with options:', this.options);
  }

  private setupWidget(lang?: SupportedLang, theme?: WidgetTheme, maxRecordingSeconds?: number): void {
    if (this.widget) return;

    this.widget = new BugReporterWidget(lang, theme, maxRecordingSeconds);

    this.widget.onScreenshot(() => this.captureScreenshot());
    this.widget.onStartRecording((opts) => this.startRecording(opts));
    this.widget.onStopRecording(() => this.stopRecording());
    this.widget.onSubmit((formData, onProgress) => this.submitReport(formData, onProgress));
  }

  identify(user: UserIdentity): void {
    this.user = user;
    this.debugLog('Identified user:', this.user);

    if (this.widget) {
      this.widget.showLauncher();
    }
  }

  setContext(key: string, value: any): void {
    this.hostMetadata[key] = value;
  }

  /** Switches the widget's colours, for sites with their own light and dark switch. */
  setTheme(theme: WidgetTheme): void {
    this.widget?.setTheme(theme);
  }

  setLanguage(lang: SupportedLang): void {
    this.widget?.setLanguage(lang);
  }

  open(): void {
    this.widget?.open();
  }

  close(): void {
    this.widget?.close();
  }

  // --- МЕДИА API ---

  async startRecording(optionsOrMic?: { microphone?: boolean; maxDurationSeconds?: number } | boolean): Promise<number> {
    const maxSec = (typeof optionsOrMic === 'object' && optionsOrMic?.maxDurationSeconds)
      ? optionsOrMic.maxDurationSeconds
      : (this.options?.maxRecordingSeconds ?? 300);
    const startTime = await this.recorder.start(optionsOrMic, maxSec);
    this.lastRecording = null;
    this.debugLog('Recording started at', startTime);
    return startTime;
  }

  async stopRecording(): Promise<RecordingResult> {
    const result = await this.recorder.stop();
    this.lastRecording = result;
    this.debugLog('Recording stopped, duration (ms):', result.durationMs);
    return result;
  }

  isRecording(): boolean {
    return this.recorder.getIsRecording();
  }

  getRecordingStartTime(): number {
    return this.recorder.getStartTime();
  }

  async captureScreenshot(): Promise<Blob> {
    this.debugLog('Capturing a screenshot');
    return await captureScreenFrame();
  }

  // --- ПУБЛИЧНЫЙ SUBMIT API (по ТЗ раздел 9) ---

  async submit(data: SubmitPayload): Promise<string> {
    const screenshots: Blob[] = [];
    if (data.attachments?.screenshot) {
      if (Array.isArray(data.attachments.screenshot)) {
        screenshots.push(...data.attachments.screenshot.slice(0, 5));
      } else {
        screenshots.push(data.attachments.screenshot);
      }
    }

    // A video from stopRecording() brings its duration and start time; the service checks the duration.
    const video = data.attachments?.video;
    const recording = video && video === this.lastRecording?.blob ? this.lastRecording : null;
    const formData: ReportFormData = {
      type: data.type,
      title: data.title,
      description: data.description || '',
      screenshots,
      video,
      videoDurationMs: video ? data.attachments?.videoDurationMs ?? recording?.durationMs : undefined,
      recordingStartTime: video ? data.attachments?.recordingStartTime ?? recording?.startTime : undefined
    };

    return await this.submitReport(formData);
  }

  // --- ВНУТРЕННЯЯ ОТПРАВКА ОТЧЕТА ---

  private async submitReport(
    formData: ReportFormData,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const context = this.getCapturedContext();
    if (formData.recordingStartTime) {
      context.recording_start_time = formData.recordingStartTime;
    }

    const payload = {
      type: formData.type,
      title: formData.title,
      description: formData.description,
      pageUrl: context.environment.url,
      videoDurationMs: formData.videoDurationMs,
      recordingStartTime: formData.recordingStartTime,
      reporter: this.user,
      environment: context.environment,
      hostMetadata: context.host_metadata
    };
    const capturedLogs = {
      console: context.console,
      network: context.network,
      breadcrumbs: context.breadcrumbs
    };

    this.debugLog('Submitting report:', payload, `screenshots: ${formData.screenshots.length}`, `video: ${Boolean(formData.video)}`);

    const form = new FormData();
    form.append('report', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    form.append('context', new Blob([JSON.stringify(capturedLogs)], { type: 'application/json' }), 'context.json');
    if (formData.video) {
      form.append('video', formData.video, `recording.${videoExtension(formData.video)}`);
    }
    // До 5 скриншотов, все в одной части screenshots
    formData.screenshots.slice(0, 5).forEach((shot, idx) => {
      form.append('screenshots', shot, `screenshot_${idx}.png`);
    });

    return await postReport(this.getIngestUrl(), form, onProgress);
  }

  private findIngestUrl(): string | null {
    const apiUrl = (this.options?.apiUrl ?? SCRIPT_ORIGIN ?? '').replace(/\/+$/, '');
    return apiUrl ? `${apiUrl}/api/v1/ingest/${encodeURIComponent(this.projectKey)}/reports` : null;
  }

  private getIngestUrl(): string {
    const ingestUrl = this.findIngestUrl();
    if (!ingestUrl) {
      throw new Error('LabReporter: set apiUrl in init(), the service address is unknown');
    }
    return ingestUrl;
  }

  private debugLog(...values: unknown[]): void {
    if (this.options?.debug) {
      console.log('[LabReporter]', ...values);
    }
  }

  // --- КОНТЕКСТ ДАННЫХ ---

  getCapturedContext(): CapturedContext {
    return {
      environment: captureEnvironment(),
      console: this.consoleCapture.getEntries(),
      network: this.networkCapture.getEntries(),
      breadcrumbs: this.breadcrumbsCapture.getEntries(),
      host_metadata: { ...this.hostMetadata },
      reporter: this.user ? { ...this.user } : null,
      recording_start_time: this.recorder.getStartTime() || undefined
    };
  }

  getDebugState(): void {
    const data = this.getCapturedContext();
    console.group('[LabReporter Debug State]');
    console.log('User:', data.reporter);
    console.log('Environment:', data.environment);
    console.log(`Console entries (${data.console.length}):`, data.console);
    console.log(`Network requests (${data.network.length}):`, data.network);
    console.log(`Breadcrumbs (${data.breadcrumbs.length}):`, data.breadcrumbs);
    console.log('Recording Start Time:', this.recorder.getStartTime());
    console.groupEnd();
  }
}

function videoExtension(video: Blob): string {
  return video.type.includes('mp4') ? 'mp4' : 'webm';
}

const LabReporter = new LabBugReporter();
Object.assign(LabReporter, {
  HelpButton,
  TypeSelector,
  ReportForm,
  ScreenshotButton,
  RecordButton,
  AttachmentList,
  SubmitBar,
  components
});

if (typeof window !== 'undefined') {
  (window as any).LabReporter = LabReporter;
}

export default LabReporter;
