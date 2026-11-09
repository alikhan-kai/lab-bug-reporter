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

class LabBugReporter {
  private projectKey: string = '';
  private options: InitOptions | null = null;
  private user: UserIdentity | null = null;
  private context: Record<string, any> = {};

  init(options: InitOptions) {
    this.options = options;
    this.projectKey = options.projectKey;
    console.log('[LabReporter] Initialized with options:', this.options);
  }

  identify(user: UserIdentity) {
    this.user = user;
    console.log('[LabReporter] Identified user:', this.user);
  }

  setContext(key: string, value: any) {
    this.context[key] = value;
  }
}

const LabReporter = new LabBugReporter();

// Expose globally for browser <script> inclusion
if (typeof window !== 'undefined') {
  (window as any).LabReporter = LabReporter;
}

export default LabReporter;
