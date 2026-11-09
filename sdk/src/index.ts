import { ConsoleCapture, ConsoleEntry } from './core/console';
import { NetworkCapture, NetworkEntry } from './core/network';
import { BreadcrumbsCapture, BreadcrumbEntry } from './core/breadcrumbs';
import { captureEnvironment, EnvironmentInfo } from './core/environment';
import { ScreenRecorder, RecordingResult } from './core/capture/recorder';
import { captureScreenFrame } from './core/capture/screenshot';
import { BugReporterWidget, ReportFormData } from './widget/widget';

export interface InitOptions {
  projectKey: string;
  widget?: boolean;
  appVersion?: string;
  apiUrl?: string;
}

export interface UserIdentity {
  id?: string;
  email?: string;
  [key: string]: any;
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
      this.networkCapture.setIngestEndpoint(this.getIngestUrl());
    }

    // Инициализируем UI виджета (если не выключен флаг widget: false)
    if (options.widget !== false && typeof document !== 'undefined') {
      this.setupWidget();
    }

    console.log('[LabReporter] Initialized with options:', this.options);
  }

  private setupWidget(): void {
    if (this.widget) return;

    this.widget = new BugReporterWidget();

    // Привязываем методы
    this.widget.onScreenshot(() => this.captureScreenshot());
    this.widget.onStartRecording(() => this.startRecording(true));
    this.widget.onStopRecording(() => this.stopRecording());
    this.widget.onSubmit((formData) => this.submitReport(formData));
  }

  identify(user: UserIdentity): void {
    this.user = user;
    console.log('[LabReporter] Identified user:', this.user);

    // Показываем кнопку виджета только после авторизации пользователя (по ТЗ)
    if (this.widget) {
      this.widget.showLauncher();
    }
  }

  setContext(key: string, value: any): void {
    this.hostMetadata[key] = value;
  }

  open(): void {
    this.widget?.open();
  }

  close(): void {
    this.widget?.close();
  }

  // --- МЕДИА API ---

  async startRecording(withMicrophone: boolean = true): Promise<number> {
    const startTime = await this.recorder.start(withMicrophone);
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

  // --- ОТПРАВКА ОТЧЕТА ---

  async submitReport(formData: ReportFormData): Promise<string> {
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

    console.group('[LabReporter SUBMIT REPORT]');
    console.log('JSON Payload:', payload);
    if (formData.screenshot) console.log('Screenshot Blob attached:', formData.screenshot);
    if (formData.video) console.log('Video Blob attached:', formData.video);
    console.groupEnd();

    // Если указан реальный бэкенд URL — отправляем multipart на сервер
    if (this.options?.apiUrl) {
      const form = new FormData();
      form.append('report', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      form.append('context', new Blob([JSON.stringify(capturedLogs)], { type: 'application/json' }), 'context.json');
      if (formData.video) {
        form.append('video', formData.video, 'recording.webm');
      }
      if (formData.screenshot) {
        form.append('screenshots', formData.screenshot, 'screenshot.png');
      }

      const res = await fetch(this.getIngestUrl(), {
        method: 'POST',
        body: form
      });

      if (!res.ok) {
        throw new Error(`Ошибка сервера: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      if (!json.reportId) {
        throw new Error('Сервер не вернул номер отчета');
      }
      return json.reportId;
    }

    // Если бэкенд напарника еще не поднят — генерируем тестовый номер
    const simRef = 'REF-' + Math.floor(10000 + Math.random() * 90000);
    return simRef;
  }

  private getIngestUrl(): string {
    return `${this.options?.apiUrl}/api/v1/ingest/${encodeURIComponent(this.projectKey)}/reports`;
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
