import { ConsoleCapture, ConsoleEntry } from './core/console';
import { NetworkCapture, NetworkEntry } from './core/network';
import { BreadcrumbsCapture, BreadcrumbEntry } from './core/breadcrumbs';
import { captureEnvironment, EnvironmentInfo } from './core/environment';
import { ScreenRecorder, RecordingResult } from './core/capture/recorder';
import { captureScreenFrame } from './core/capture/screenshot';

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
    console.log('[LabReporter] Initialized with options:', this.options);
  }

  identify(user: UserIdentity): void {
    this.user = user;
    console.log('[LabReporter] Identified user:', this.user);
  }

  setContext(key: string, value: any): void {
    this.hostMetadata[key] = value;
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
