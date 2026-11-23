import { widgetStyles } from './tokens.css';
import { detectLanguage, getTranslations, SupportedLang, Translations } from '../core/i18n';
import { MAX_RECORDING_SECONDS, RecordingResult } from '../core/capture/recorder';
import { SubmitError } from '../core/upload';
import { appearanceStyles, resolveAppearance, ResolvedAppearance, WidgetAppearance } from './appearance';
import { loadWidgetFont } from './font';
import { icons } from './icons';

// The recording bar warns this many seconds before the recording stops at the limit.
const RECORDING_WARNING_SECONDS = 30;
const MAX_SCREENSHOTS = 5;

/** light and dark are fixed; system follows the visitor's system setting. */
export type WidgetTheme = 'light' | 'dark' | 'system';

type ReportType = 'bug' | 'feature' | 'question';

export interface ReportFormData {
  type: ReportType;
  title: string;
  description: string;
  screenshots: Blob[]; // до 5 скриншотов по ТЗ
  video?: Blob;
  videoDurationMs?: number;
  recordingStartTime?: number;
}

export class BugReporterWidget {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private appearanceStyleEl: HTMLStyleElement | null = null;
  private appearance: ResolvedAppearance = resolveAppearance();

  // Элементы
  private launcherBtn!: HTMLButtonElement;
  private launcherText!: HTMLSpanElement;
  private panel!: HTMLElement;
  private formView!: HTMLDivElement;
  private successView!: HTMLDivElement;
  private footerEl!: HTMLDivElement;

  private titleInput!: HTMLInputElement;
  private descInput!: HTMLTextAreaElement;
  private typeButtons: HTMLButtonElement[] = [];
  private attachmentsList!: HTMLUListElement;
  private submitBtn!: HTMLButtonElement;
  private submitText!: HTMLSpanElement;
  private screenshotBtn!: HTMLButtonElement;
  private screenshotHint!: HTMLSpanElement;
  private recordBtn!: HTMLButtonElement;
  private recordBtnText!: HTMLSpanElement;
  private refBadge!: HTMLElement;

  // Прогресс загрузки и ошибка
  private progressContainer!: HTMLDivElement;
  private progressBar!: HTMLDivElement;
  private errorBanner!: HTMLParagraphElement;
  private errorTextEl!: HTMLSpanElement;

  // Плавающая плашка записи экрана
  private recordingBar!: HTMLDivElement;
  private barTimerEl!: HTMLSpanElement;
  private barStopBtn!: HTMLButtonElement;

  // Мультиязычность
  private lang: SupportedLang = 'ru';
  private t!: Translations;

  // Состояние
  private currentType: ReportType = 'bug';
  private currentScreenshots: Blob[] = []; // до 5 штук
  private currentVideo: Blob | null = null;
  private currentVideoDuration: number = 0;
  /** One object URL per recording, so that redrawing the list does not leak a new one each time. */
  private videoPreviewUrl: string | null = null;
  private recordingStartTime: number = 0;
  private isRecording: boolean = false;
  private isRetryMode: boolean = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private maxRecordingSeconds: number = MAX_RECORDING_SECONDS;

  // Callbacks
  private onScreenshotCallback?: () => Promise<Blob>;
  private onStartRecordingCallback?: (options?: { microphone?: boolean; maxDurationSeconds?: number }) => Promise<number>;
  private onStopRecordingCallback?: () => Promise<RecordingResult>;
  private onSubmitCallback?: (data: ReportFormData, onProgress: (percent: number) => void) => Promise<string>;

  constructor(
    preferredLang?: string,
    theme: WidgetTheme = 'light',
    appearance?: WidgetAppearance,
    maxRecordingSeconds: number = MAX_RECORDING_SECONDS,
  ) {
    this.maxRecordingSeconds = maxRecordingSeconds;
    this.lang = detectLanguage(preferredLang);
    this.t = getTranslations(this.lang);
    this.initDOM();
    this.setTheme(theme);
    this.setAppearance(appearance ?? {});
  }

  setTheme(theme: WidgetTheme): void {
    // The styles pick their colours from this attribute on the shadow host.
    this.host?.setAttribute('data-theme', theme);
  }

  /** Applies a site's button, accent, corners and place. Values left out return to the defaults. */
  setAppearance(appearance: WidgetAppearance): void {
    this.appearance = resolveAppearance(appearance);
    this.host?.setAttribute('data-launcher', this.appearance.launcher);
    this.host?.setAttribute('data-position', this.appearance.position);
    if (this.appearanceStyleEl) {
      this.appearanceStyleEl.textContent = appearanceStyles(this.appearance);
    }
    if (this.launcherText) {
      this.updateLauncherText();
    }
  }

  setLanguage(lang: SupportedLang): void {
    this.lang = lang;
    this.t = getTranslations(lang);
    this.updateTexts();
  }

  private initDOM(): void {
    if (typeof document === 'undefined') return;
    loadWidgetFont();

    this.host = document.createElement('div');
    this.host.id = 'lab-reporter-root';
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    this.shadow.appendChild(styleEl);
    // After the base styles, so a site's accent wins over the theme's.
    this.appearanceStyleEl = document.createElement('style');
    this.shadow.appendChild(this.appearanceStyleEl);

    const container = document.createElement('div');
    container.innerHTML = `
      <button class="lab-launcher hidden" id="lab-launcher" type="button" aria-expanded="false" aria-controls="lab-panel">
        <span class="lab-launcher-mark">${icons.mark(18)}</span>
        <span class="lab-launcher-close">${icons.close(18)}</span>
        <span class="lab-launcher-text" id="lab-launcher-text"></span>
      </button>

      <div class="lab-recording-bar hidden" id="lab-recording-bar" role="status">
        <span class="lab-rec-dot" aria-hidden="true"></span>
        <span class="lab-rec-time" id="lab-bar-timer">0:00</span>
        <button class="lab-bar-stop-btn" id="lab-bar-stop" type="button">${this.t.btnRecordStop}</button>
      </div>

      <section class="lab-panel" id="lab-panel" role="dialog" aria-labelledby="lab-header-title">
        <div class="lab-header">
          <div>
            <h2 id="lab-header-title">${this.t.headerTitle}</h2>
            <p class="lab-subtitle" id="lab-header-subtitle">${this.t.headerSubtitle}</p>
          </div>
          <button class="lab-close-btn" id="lab-close" type="button" title="${this.t.btnClose}" aria-label="${this.t.btnClose}">
            ${icons.close(18)}
          </button>
        </div>

        <div class="lab-body" id="lab-form-view">
          <p class="lab-error-banner hidden" id="lab-error-banner" role="alert">
            ${icons.alert(16)}
            <span id="lab-error-text">${this.t.errorUploadText}</span>
          </p>

          <div class="lab-type-selector" role="radiogroup" id="lab-type-selector" aria-label="${this.t.typeLabel}">
            <button class="lab-type-btn" type="button" role="radio" aria-checked="true" tabindex="0" data-type="bug" id="lab-type-bug">${this.t.typeBug}</button>
            <button class="lab-type-btn" type="button" role="radio" aria-checked="false" tabindex="-1" data-type="feature" id="lab-type-feature">${this.t.typeFeature}</button>
            <button class="lab-type-btn" type="button" role="radio" aria-checked="false" tabindex="-1" data-type="question" id="lab-type-question">${this.t.typeQuestion}</button>
          </div>

          <div class="lab-field">
            <label for="lab-title" id="lab-label-title">${this.t.titleLabel}</label>
            <input type="text" class="lab-input" id="lab-title" required placeholder="${this.t.titlePlaceholder}" />
          </div>

          <div class="lab-field">
            <label for="lab-desc"><span id="lab-label-desc">${this.t.descLabel}</span> <span class="lab-optional" id="lab-label-optional">— ${this.t.optionalHint}</span></label>
            <textarea class="lab-textarea" id="lab-desc" rows="3" placeholder="${this.t.descPlaceholder}"></textarea>
          </div>

          <div class="lab-media-actions">
            <button class="lab-tile" id="lab-btn-screenshot" type="button">
              ${icons.camera(18)}
              <span class="lab-tile-text">
                <span class="lab-tile-label" id="lab-btn-screenshot-text">${this.t.btnScreenshot}</span>
                <span class="lab-tile-hint lab-mono" id="lab-screenshot-hint">${this.t.screenshotHint}</span>
              </span>
            </button>
            <button class="lab-tile" id="lab-btn-record" type="button">
              ${icons.record(18)}
              <span class="lab-tile-text">
                <span class="lab-tile-label" id="lab-record-text">${this.t.btnRecord}</span>
                <span class="lab-tile-hint lab-mono" id="lab-record-hint">${this.t.recordHint}</span>
              </span>
            </button>
          </div>

          <ul class="lab-attachments-list" id="lab-attachments" aria-label="${this.t.attachmentsLabel}"></ul>

          <p class="lab-context-note">
            <span id="lab-context-note">${this.t.contextNote}</span>
            <span id="lab-privacy-note">${this.t.privacyNote}</span>
          </p>
        </div>

        <div class="lab-success-view" id="lab-success-view">
          ${icons.sent(28)}
          <h3 id="lab-success-title">${this.t.successTitle}</h3>
          <p id="lab-success-desc">${this.t.successDesc}</p>
          <span class="lab-ref lab-mono"><span id="lab-ref-label">${this.t.refLabel}</span> <span id="lab-ref-badge"></span></span>
          <div class="lab-success-actions">
            <button class="lab-btn-secondary" id="lab-btn-new-report" type="button">${this.t.btnNewReport}</button>
            <button class="lab-btn-primary" id="lab-btn-done" type="button">${this.t.btnDone}</button>
          </div>
        </div>

        <div class="lab-footer" id="lab-footer">
          <div class="lab-progress-container" id="lab-progress-container">
            <div class="lab-progress-bar" id="lab-progress-bar"></div>
          </div>
          <button class="lab-submit-btn" id="lab-submit-btn" type="button">
            <span id="lab-submit-text">${this.t.submitBtn}</span>
          </button>
        </div>
      </section>
    `;

    this.shadow.appendChild(container);
    this.bindElements();
  }

  private bindElements(): void {
    if (!this.shadow) return;
    const byId = <T extends HTMLElement>(id: string) => this.shadow!.getElementById(id) as T;

    this.launcherBtn = byId('lab-launcher');
    this.launcherText = byId('lab-launcher-text');
    this.panel = byId('lab-panel');
    this.formView = byId('lab-form-view');
    this.successView = byId('lab-success-view');
    this.footerEl = byId('lab-footer');
    this.titleInput = byId('lab-title');
    this.descInput = byId('lab-desc');
    this.attachmentsList = byId('lab-attachments');
    this.submitBtn = byId('lab-submit-btn');
    this.submitText = byId('lab-submit-text');
    this.screenshotBtn = byId('lab-btn-screenshot');
    this.screenshotHint = byId('lab-screenshot-hint');
    this.recordBtn = byId('lab-btn-record');
    this.recordBtnText = byId('lab-record-text');
    this.refBadge = byId('lab-ref-badge');
    this.progressContainer = byId('lab-progress-container');
    this.progressBar = byId('lab-progress-bar');
    this.errorBanner = byId('lab-error-banner');
    this.errorTextEl = byId('lab-error-text');
    this.recordingBar = byId('lab-recording-bar');
    this.barTimerEl = byId('lab-bar-timer');
    this.barStopBtn = byId('lab-bar-stop');
    this.updateLauncherText();

    this.typeButtons = Array.from(this.shadow.querySelectorAll<HTMLButtonElement>('.lab-type-btn'));
    this.typeButtons.forEach((button) => {
      button.addEventListener('click', () => this.selectType(button.dataset.type as ReportType));
    });
    // Arrow keys move between the types, as in any radio group.
    byId('lab-type-selector').addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const index = this.typeButtons.findIndex((button) => button.dataset.type === this.currentType);
      const next = this.typeButtons[(index + step + this.typeButtons.length) % this.typeButtons.length];
      this.selectType(next.dataset.type as ReportType);
      next.focus();
    });

    // The launcher opens the form and, while it is open, closes it.
    this.launcherBtn.addEventListener('click', () => (this.panel.classList.contains('open') ? this.close() : this.open()));
    byId('lab-close').addEventListener('click', () => this.close());

    byId('lab-btn-done').addEventListener('click', () => {
      this.resetForm();
      this.close();
    });

    byId('lab-btn-new-report').addEventListener('click', () => {
      this.resetForm();
      this.titleInput.focus();
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.panel.classList.contains('open')) {
        this.close();
      }
    });

    this.screenshotBtn.addEventListener('click', () => void this.takeScreenshot());
    this.recordBtn.addEventListener('click', () => void this.handleToggleRecording());
    this.barStopBtn.addEventListener('click', () => void this.handleToggleRecording());

    this.titleInput.addEventListener('input', () => {
      this.titleInput.removeAttribute('aria-invalid');
    });

    this.submitBtn.addEventListener('click', () => void this.submit());
  }

  private selectType(type: ReportType): void {
    this.currentType = type;
    this.typeButtons.forEach((button) => {
      const isSelected = button.dataset.type === type;
      button.setAttribute('aria-checked', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });
  }

  // The widget hides while the screen is captured, so it does not cover what the visitor wants to show.
  private async takeScreenshot(): Promise<void> {
    if (this.currentScreenshots.length >= MAX_SCREENSHOTS || !this.onScreenshotCallback || !this.host) return;

    this.host.style.display = 'none';
    try {
      const blob = await this.onScreenshotCallback();
      this.currentScreenshots.push(blob);
      this.renderAttachments();
    } catch (err) {
      console.error('[LabReporter] Ошибка скриншота:', err);
    } finally {
      this.host.style.display = '';
    }
  }

  private async submit(): Promise<void> {
    const title = this.titleInput.value.trim();
    if (!title) {
      this.titleInput.setAttribute('aria-invalid', 'true');
      this.titleInput.focus();
      return;
    }
    if (!this.onSubmitCallback) return;

    this.hideError();
    this.submitBtn.disabled = true;

    // A recording still running belongs to this report, so it is finished first.
    if (this.isRecording) {
      await this.stopRecording();
    }

    this.progressContainer.classList.add('active');
    this.progressBar.style.width = '2%';
    this.submitText.innerText = this.t.submittingText;

    try {
      const refId = await this.onSubmitCallback({
        type: this.currentType,
        title,
        description: this.descInput.value.trim(),
        screenshots: [...this.currentScreenshots],
        video: this.currentVideo || undefined,
        videoDurationMs: this.currentVideo ? this.currentVideoDuration : undefined,
        recordingStartTime: this.currentVideo ? this.recordingStartTime : undefined
      }, (percent: number) => {
        // The upload ends at 100%, but the service still stores the files, so the bar stops short of the end.
        this.progressBar.style.width = `${Math.min(95, Math.max(2, percent))}%`;
      });

      this.progressBar.style.width = '100%';
      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showSuccess(refId);
      }, 300);
    } catch (err: unknown) {
      // The form keeps what the visitor wrote, and the button becomes Retry.
      this.progressContainer.classList.remove('active');
      this.progressBar.style.width = '0%';
      this.showError(this.describeSubmitError(err));
    }
  }

  // The service explains a rejected report (too large, unknown project); other failures get the general text.
  private describeSubmitError(error: unknown): string {
    if (error instanceof SubmitError && error.status >= 400 && error.status < 500) {
      return error.message;
    }
    return this.t.errorUploadText;
  }

  private showError(msg: string): void {
    this.isRetryMode = true;
    this.errorBanner.classList.remove('hidden');
    this.errorTextEl.innerText = msg;
    this.submitBtn.disabled = false;
    this.submitText.innerText = this.t.retryBtn;
  }

  private hideError(): void {
    this.isRetryMode = false;
    this.errorBanner.classList.add('hidden');
    this.submitText.innerText = this.t.submitBtn;
  }

  // A site's own text wins over the page language's word.
  private updateLauncherText(): void {
    const text = this.appearance.launcherText ?? this.t.launcherText;
    this.launcherText.textContent = text;
    const isOpen = this.panel?.classList.contains('open') ?? false;
    const showsClose = isOpen && this.appearance.launcher !== 'tab';
    this.launcherBtn.setAttribute('aria-label', showsClose ? this.t.launcherClose : text);
  }

  private updateTexts(): void {
    if (!this.shadow) return;
    const setText = (id: string, text: string) => {
      const element = this.shadow?.getElementById(id);
      if (element) element.innerText = text;
    };

    this.updateLauncherText();
    this.barStopBtn.innerText = this.t.btnRecordStop;
    this.recordBtnText.innerText = this.isRecording ? this.t.btnRecordStop : this.t.btnRecord;
    const closeButton = this.shadow.getElementById('lab-close');
    closeButton?.setAttribute('title', this.t.btnClose);
    closeButton?.setAttribute('aria-label', this.t.btnClose);

    setText('lab-header-title', this.t.headerTitle);
    setText('lab-header-subtitle', this.t.headerSubtitle);
    this.shadow.getElementById('lab-type-selector')?.setAttribute('aria-label', this.t.typeLabel);
    setText('lab-type-bug', this.t.typeBug);
    setText('lab-type-feature', this.t.typeFeature);
    setText('lab-type-question', this.t.typeQuestion);

    setText('lab-label-title', this.t.titleLabel);
    this.titleInput.placeholder = this.t.titlePlaceholder;
    setText('lab-label-desc', this.t.descLabel);
    setText('lab-label-optional', `— ${this.t.optionalHint}`);
    this.descInput.placeholder = this.t.descPlaceholder;

    setText('lab-btn-screenshot-text', this.t.btnScreenshot);
    setText('lab-record-hint', this.t.recordHint);
    this.attachmentsList.setAttribute('aria-label', this.t.attachmentsLabel);
    setText('lab-context-note', this.t.contextNote);
    setText('lab-privacy-note', this.t.privacyNote);

    setText('lab-success-title', this.t.successTitle);
    setText('lab-success-desc', this.t.successDesc);
    setText('lab-ref-label', this.t.refLabel);
    setText('lab-btn-new-report', this.t.btnNewReport);
    setText('lab-btn-done', this.t.btnDone);

    if (!this.isRetryMode) {
      this.submitText.innerText = this.t.submitBtn;
    }
    this.renderAttachments();
  }

  private async handleToggleRecording(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
      this.open();
      return;
    }
    if (!this.onStartRecordingCallback) return;
    try {
      this.recordingStartTime = await this.onStartRecordingCallback({
        microphone: true,
        maxDurationSeconds: this.maxRecordingSeconds
      });
      this.isRecording = true;
      this.recordBtnText.innerText = this.t.btnRecordStop;
      this.recordBtn.classList.add('is-recording');
      this.close();
      this.startRecordBar();
    } catch (err) {
      console.error('[LabReporter] Ошибка старта записи:', err);
    }
  }

  private async stopRecording(): Promise<void> {
    if (!this.onStopRecordingCallback) return;
    try {
      this.attachRecording(await this.onStopRecordingCallback());
    } catch (err) {
      console.error('[LabReporter] Ошибка остановки записи:', err);
    }
  }

  /** Shows a recording that stopped without the stop button: at the time limit or from the browser's sharing bar. */
  showStoppedRecording(result: RecordingResult): void {
    if (!this.isRecording) return;
    this.attachRecording(result);
    this.open();
  }

  private attachRecording(result: RecordingResult): void {
    this.clearVideo();
    this.currentVideo = result.blob;
    this.videoPreviewUrl = URL.createObjectURL(result.blob);
    this.currentVideoDuration = result.durationMs;
    this.recordingStartTime = result.startTime;
    this.isRecording = false;
    this.recordBtnText.innerText = this.t.btnRecord;
    this.recordBtn.classList.remove('is-recording');
    this.stopRecordBar();
    this.renderAttachments();
  }

  private startRecordBar(): void {
    this.recordingBar.classList.remove('hidden', 'warning');
    this.barTimerEl.innerText = '0:00';

    // Counted from the start time, because a background tab slows the interval down.
    this.timerInterval = setInterval(() => {
      const seconds = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const secondsLeft = Math.max(0, this.maxRecordingSeconds - seconds);
      const isEndingSoon = secondsLeft <= RECORDING_WARNING_SECONDS;
      this.recordingBar.classList.toggle('warning', isEndingSoon);
      this.barTimerEl.innerText = isEndingSoon
        ? `${formatSeconds(seconds)} · ${this.t.recordingTimeLeft.replace('{seconds}', String(secondsLeft))}`
        : formatSeconds(seconds);
    }, 1000);
  }

  private stopRecordBar(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.recordingBar.classList.add('hidden');
    this.recordingBar.classList.remove('warning');
  }

  private renderAttachments(): void {
    this.attachmentsList.innerHTML = '';

    const count = this.currentScreenshots.length;
    this.screenshotBtn.disabled = count >= MAX_SCREENSHOTS;
    this.screenshotHint.innerText = count > 0 ? this.t.screenshotCount.replace('{count}', String(count)) : this.t.screenshotHint;

    this.currentScreenshots.forEach((blob, index) => {
      this.attachmentsList.appendChild(this.createAttachment(
        icons.image(13),
        `${this.t.screenshotItem} ${index + 1}`,
        formatSize(blob.size),
        () => {
          this.currentScreenshots.splice(index, 1);
          this.renderAttachments();
        }
      ));
    });

    if (this.currentVideo && this.videoPreviewUrl) {
      this.attachmentsList.appendChild(this.createAttachment(
        icons.video(13),
        this.t.videoItem,
        formatSeconds(Math.round(this.currentVideoDuration / 1000)),
        () => {
          this.clearVideo();
          this.renderAttachments();
        }
      ));

      // The visitor watches the recording before it is sent.
      const previewItem = document.createElement('li');
      previewItem.className = 'lab-video-preview';
      const video = document.createElement('video');
      video.controls = true;
      video.src = this.videoPreviewUrl;
      video.setAttribute('aria-label', this.t.videoItem);
      previewItem.appendChild(video);
      this.attachmentsList.appendChild(previewItem);
    }
  }

  private clearVideo(): void {
    if (this.videoPreviewUrl) {
      URL.revokeObjectURL(this.videoPreviewUrl);
      this.videoPreviewUrl = null;
    }
    this.currentVideo = null;
    this.currentVideoDuration = 0;
    this.recordingStartTime = 0;
  }

  private createAttachment(iconSvg: string, name: string, detail: string, onRemove: () => void): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'lab-attachment-item';
    item.innerHTML = `${iconSvg}<span class="lab-attachment-name"></span><span class="lab-mono"></span>` +
      `<button class="lab-btn-remove" type="button">${icons.close(12)}</button>`;
    (item.querySelector('.lab-attachment-name') as HTMLElement).textContent = name;
    (item.querySelector('.lab-mono') as HTMLElement).textContent = detail;
    const removeButton = item.querySelector('button') as HTMLButtonElement;
    removeButton.setAttribute('aria-label', `${this.t.removeAttachment}: ${name}`);
    removeButton.addEventListener('click', onRemove);
    return item;
  }

  showLauncher(): void {
    this.launcherBtn.classList.remove('hidden');
  }

  hideLauncher(): void {
    this.launcherBtn.classList.add('hidden');
  }

  open(): void {
    const wasOpen = this.panel.classList.contains('open');
    this.panel.classList.add('open');
    this.launcherBtn.classList.add('is-open');
    this.launcherBtn.setAttribute('aria-expanded', 'true');
    this.updateLauncherText();
    if (!wasOpen && this.formView.style.display !== 'none') {
      this.titleInput.focus({ preventScroll: true });
    }
  }

  close(): void {
    const hadFocus = this.shadow?.activeElement !== null && this.panel.contains(this.shadow?.activeElement ?? null);
    this.panel.classList.remove('open');
    this.launcherBtn.classList.remove('is-open');
    this.launcherBtn.setAttribute('aria-expanded', 'false');
    this.updateLauncherText();
    // Focus goes back to the launcher, so a keyboard user does not land at the top of the page.
    if (hadFocus && !this.launcherBtn.classList.contains('hidden') && this.appearance.launcher !== 'none') {
      this.launcherBtn.focus({ preventScroll: true });
    }
  }

  showSuccess(refId: string): void {
    this.formView.style.display = 'none';
    this.footerEl.style.display = 'none';
    this.successView.style.display = 'flex';
    this.refBadge.innerText = refId;
  }

  resetForm(): void {
    this.titleInput.value = '';
    this.titleInput.removeAttribute('aria-invalid');
    this.descInput.value = '';
    this.currentScreenshots = [];
    this.clearVideo();
    this.selectType('bug');

    this.hideError();
    this.renderAttachments();
    this.formView.style.display = 'flex';
    this.footerEl.style.display = 'flex';
    this.successView.style.display = 'none';
    this.submitBtn.disabled = false;
  }

  onScreenshot(cb: () => Promise<Blob>): void { this.onScreenshotCallback = cb; }
  onStartRecording(cb: (options?: { microphone?: boolean }) => Promise<number>): void { this.onStartRecordingCallback = cb; }
  onStopRecording(cb: () => Promise<RecordingResult>): void { this.onStopRecordingCallback = cb; }
  onSubmit(cb: (data: ReportFormData, onProgress: (percent: number) => void) => Promise<string>): void { this.onSubmitCallback = cb; }
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
