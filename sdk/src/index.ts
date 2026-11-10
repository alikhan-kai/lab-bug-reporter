import { ConsoleCapture, ConsoleEntry } from './core/console';
import { NetworkCapture, NetworkEntry } from './core/network';
import { BreadcrumbsCapture, BreadcrumbEntry } from './core/breadcrumbs';
import { captureEnvironment, EnvironmentInfo } from './core/environment';
import { ScreenRecorder, RecordingResult } from './core/capture/recorder';
import { captureScreenFrame } from './core/capture/screenshot';
import { BugReporterWidget, ReportFormData } from './widget/widget';
import { SupportedLang } from './core/i18n';

export interface InitOptions {
  projectKey: string;
  widget?: boolean;
  appVersion?: string;
  apiUrl?: string;
  lang?: SupportedLang;
}

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

  // Виджет UI
  private widget: BugReporterWidget | null = null;

  constructor() {
    this.consoleCapture.install();
    this.networkCapture.install();
    this.breadcrumbsCapture.install();
  }

  init(options: InitOptions): void {
    this.options = options;
    this.projectKey = options.projectKey;
    if (options.appVersion) {
      this.hostMetadata['app_version'] = options.appVersion;
    }
    if (options.apiUrl) {
      this.networkCapture.setIngestEndpoint(`${options.apiUrl}/api/ingest/reports`);
    }

    if (options.widget !== false && typeof document !== 'undefined') {
      this.setupWidget(options.lang);
    }

    console.log('[LabReporter] Initialized with options:', this.options);
  }

  private setupWidget(lang?: SupportedLang): void {
    if (this.widget) return;

    this.widget = new BugReporterWidget(lang);

    this.widget.onScreenshot(() => this.captureScreenshot());
    this.widget.onStartRecording((opts) => this.startRecording(opts));
    this.widget.onStopRecording(() => this.stopRecording());
    this.widget.onSubmit((formData, onProgress) => this.submitReport(formData, onProgress));
  }

  identify(user: UserIdentity): void {
    this.user = user;
    console.log('[LabReporter] Identified user:', this.user);

    if (this.widget) {
      this.widget.showLauncher();
    }
  }

  setContext(key: string, value: any): void {
    this.hostMetadata[key] = value;
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

  async startRecording(optionsOrMic?: { microphone?: boolean } | boolean): Promise<number> {
    const startTime = await this.recorder.start(optionsOrMic);
    console.log('[LabReporter] Запись экрана началась в:', startTime);
    return startTime;
  }

  async stopRecording(): Promise<RecordingResult> {
    const result = await this.recorder.stop();
    console.log('[LabReporter] Запись экрана завершена. Длительность (мс):', result.durationMs);
    return result;
  }

  isRecording(): boolean {
    return this.recorder.getIsRecording();
  }

  getRecordingStartTime(): number {
    return this.recorder.getStartTime();
  }

  async captureScreenshot(): Promise<Blob> {
    console.log('[LabReporter] Захват скриншота...');
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

    const formData: ReportFormData = {
      type: data.type,
      title: data.title,
      description: data.description || '',
      screenshots,
      video: data.attachments?.video,
      recordingStartTime: this.recorder.getStartTime() || undefined
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
      projectKey: this.projectKey,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      recordingStartTime: formData.recordingStartTime,
      reporter: this.user,
      environment: context.environment,
      host_metadata: context.host_metadata,
      console: context.console,
      network: context.network,
      breadcrumbs: context.breadcrumbs
    };

    console.group('[LabReporter SUBMIT REPORT]');
    console.log('JSON Payload:', payload);
    console.log(`Screenshots attached (${formData.screenshots.length}):`, formData.screenshots);
    if (formData.video) console.log('Video Blob attached:', formData.video);
    console.groupEnd();

    // Симуляция прогресса
    if (onProgress) {
      onProgress(35);
      await new Promise(r => setTimeout(r, 150));
      onProgress(70);
      await new Promise(r => setTimeout(r, 150));
    }

    // Если указан реальный бэкенд URL — отправляем multipart
    if (this.options?.apiUrl) {
      const form = new FormData();
      form.append('report', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      
      if (formData.video) {
        form.append('video', formData.video, 'recording.webm');
      }

      // До 5 скриншотов
      formData.screenshots.forEach((shot, idx) => {
        form.append(`screenshot_${idx}`, shot, `screenshot_${idx}.png`);
      });

      const res = await fetch(`${this.options.apiUrl}/api/ingest/reports`, {
        method: 'POST',
        headers: {
          'X-Project-Key': this.projectKey
        },
        body: form
      });

      if (!res.ok) {
        throw new Error(`Ошибка сервера: ${res.status} ${res.statusText}`);
      }

      if (onProgress) onProgress(100);
      const json = await res.json();
      return json.reportId || json.id || 'REF-' + Math.floor(10000 + Math.random() * 90000);
    }

    if (onProgress) onProgress(100);
    const simRef = 'REF-' + Math.floor(10000 + Math.random() * 90000);
    return simRef;
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

const LabReporter = new LabBugReporter();

if (typeof window !== 'undefined') {
  (window as any).LabReporter = LabReporter;
}

export default LabReporter;
