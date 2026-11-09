import { ConsoleCapture, ConsoleEntry } from './core/console';
import { NetworkCapture, NetworkEntry } from './core/network';
import { BreadcrumbsCapture, BreadcrumbEntry } from './core/breadcrumbs';
import { captureEnvironment, EnvironmentInfo } from './core/environment';

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

  constructor() {
    // Автоматически запускаем перехватчики ядра
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

  /**
   * Собрать весь накопленный контекст на текущий момент (для отправки или отладки)
   */
  getCapturedContext(): CapturedContext {
    return {
      environment: captureEnvironment(),
      console: this.consoleCapture.getEntries(),
      network: this.networkCapture.getEntries(),
      breadcrumbs: this.breadcrumbsCapture.getEntries(),
      host_metadata: { ...this.hostMetadata },
      reporter: this.user ? { ...this.user } : null
    };
  }

  /**
   * Служебный метод для проверки в консоли браузера
   */
  getDebugState(): void {
    const data = this.getCapturedContext();
    console.group('[LabReporter Debug State]');
    console.log('User:', data.reporter);
    console.log('Environment:', data.environment);
    console.log(`Console entries (${data.console.length}):`, data.console);
    console.log(`Network requests (${data.network.length}):`, data.network);
    console.log(`Breadcrumbs (${data.breadcrumbs.length}):`, data.breadcrumbs);
    console.groupEnd();
  }
}

const LabReporter = new LabBugReporter();

if (typeof window !== 'undefined') {
  (window as any).LabReporter = LabReporter;
}

export default LabReporter;
