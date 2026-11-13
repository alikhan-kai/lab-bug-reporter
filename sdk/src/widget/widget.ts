import { widgetStyles } from './tokens.css';
import { detectLanguage, getTranslations, SupportedLang, Translations } from '../core/i18n';
import { MAX_RECORDING_SECONDS, RecordingResult } from '../core/capture/recorder';
import { SubmitError } from '../core/upload';
import { loadWidgetFont } from './font';
import { icons } from './icons';

// The recording bar warns this many seconds before the recording stops at the limit.
const RECORDING_WARNING_SECONDS = 30;

/** light and dark are fixed; system follows the visitor's system setting. */
export type WidgetTheme = 'light' | 'dark' | 'system';

export interface ReportFormData {
  type: 'bug' | 'feature' | 'question';
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

  // Элементы
  private launcherBtn!: HTMLButtonElement;
  private backdrop!: HTMLDivElement;
  private sidebar!: HTMLDivElement;
  private formView!: HTMLDivElement;
  private successView!: HTMLDivElement;
  private footerEl!: HTMLDivElement;

  private titleInput!: HTMLInputElement;
  private descInput!: HTMLTextAreaElement;
  private typeButtons: HTMLButtonElement[] = [];
  private attachmentsList!: HTMLDivElement;
  private submitBtn!: HTMLButtonElement;
  private screenshotBtn!: HTMLButtonElement;
  private screenshotBtnText!: HTMLSpanElement;
  private recordBtn!: HTMLButtonElement;
  private recordBtnText!: HTMLSpanElement;
  private refBadge!: HTMLElement;

  // Прогресс загрузки и ошибка
  private progressContainer!: HTMLDivElement;
  private progressBar!: HTMLDivElement;
  private errorBanner!: HTMLDivElement;
  private errorTextEl!: HTMLSpanElement;

  // Плавающая плашка записи экрана
  private recordingBar!: HTMLDivElement;
  private barTimerEl!: HTMLSpanElement;
  private barStopBtn!: HTMLButtonElement;

  // Мультиязычность
  private lang: SupportedLang = 'ru';
  private t!: Translations;

  // Состояние
  private currentType: 'bug' | 'feature' | 'question' = 'bug';
  private currentScreenshots: Blob[] = []; // до 5 штук
  private currentVideo: Blob | null = null;
  private currentVideoDuration: number = 0;
  private recordingStartTime: number = 0;
  private isRecording: boolean = false;
  private isRetryMode: boolean = false;
  private timerInterval: any = null;
  private maxRecordingSeconds: number = MAX_RECORDING_SECONDS;

  // Callbacks
  private onScreenshotCallback?: () => Promise<Blob>;
  private onStartRecordingCallback?: (options?: { microphone?: boolean; maxDurationSeconds?: number }) => Promise<number>;
  private onStopRecordingCallback?: () => Promise<RecordingResult>;
  private onSubmitCallback?: (data: ReportFormData, onProgress: (percent: number) => void) => Promise<string>;

  constructor(preferredLang?: string, theme: WidgetTheme = 'light', maxRecordingSeconds: number = MAX_RECORDING_SECONDS) {
    this.maxRecordingSeconds = maxRecordingSeconds;
    this.lang = detectLanguage(preferredLang);
    this.t = getTranslations(this.lang);
    this.initDOM();
    this.setTheme(theme);
  }

  setTheme(theme: WidgetTheme): void {
    // The styles pick their colours from this attribute on the shadow host.
    this.host?.setAttribute('data-theme', theme);
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

    const container = document.createElement('div');
    container.innerHTML = `
      <!-- Кнопка-лаунчер -->
      <button class="lab-launcher hidden" id="lab-launcher">
        ${icons.help(16)}
        <span id="lab-launcher-text">${this.t.launcherText}</span>
      </button>

      <!-- ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАПИСИ (Jam.dev стиль) -->
      <div class="lab-recording-bar hidden" id="lab-recording-bar">
        <div class="lab-rec-dot"></div>
        <span class="lab-rec-time" id="lab-bar-timer">0:00</span>
        <button class="lab-bar-stop-btn" id="lab-bar-stop" type="button">
          ${icons.stop(12)}
          <span id="lab-bar-stop-text">${this.t.btnRecordStop}</span>
        </button>
      </div>

      <!-- Затемнение фона -->
      <div class="lab-backdrop" id="lab-backdrop"></div>

      <!-- Выезжающий сайдбар -->
      <div class="lab-sidebar" id="lab-sidebar">
        <div class="lab-header">
          <h2 id="lab-header-title">${this.t.headerTitle}</h2>
          <button class="lab-close-btn" id="lab-close" type="button" title="${this.t.btnClose}" aria-label="${this.t.btnClose}">
            ${icons.close(18)}
          </button>
        </div>

        <!-- Форма -->
        <div class="lab-body" id="lab-form-view">
          <!-- Блок ошибки загрузки (Inline Error с Retry) -->
          <div class="lab-error-banner hidden" id="lab-error-banner">
            <span class="lab-error-icon">${icons.alert(16)}</span>
            <span id="lab-error-text">${this.t.errorUploadText}</span>
          </div>

          <!-- Тип отчета (со скользящим индикатором) -->
          <div class="lab-type-selector">
            <div class="lab-type-indicator" id="lab-type-indicator"></div>
            <button class="lab-type-btn active" data-type="bug" data-index="0" id="lab-type-bug">${this.t.typeBug}</button>
            <button class="lab-type-btn" data-type="feature" data-index="1" id="lab-type-feature">${this.t.typeFeature}</button>
            <button class="lab-type-btn" data-type="question" data-index="2" id="lab-type-question">${this.t.typeQuestion}</button>
          </div>

          <!-- Заголовок -->
          <div class="lab-field">
            <label id="lab-label-title">${this.t.titleLabel}</label>
            <input type="text" class="lab-input" id="lab-title" placeholder="${this.t.titlePlaceholder}" />
          </div>

          <!-- Описание -->
          <div class="lab-field">
            <label id="lab-label-desc">${this.t.descLabel}</label>
            <textarea class="lab-textarea" id="lab-desc" placeholder="${this.t.descPlaceholder}"></textarea>
          </div>

          <!-- Кнопки захвата медиа -->
          <div class="lab-field">
            <label id="lab-label-attachments">${this.t.attachmentsLabel}</label>
            <div class="lab-media-actions">
              <button class="lab-btn-outline" id="lab-btn-screenshot" type="button">
                ${icons.camera(16)}
                <span id="lab-btn-screenshot-text">${this.t.btnScreenshot}</span>
              </button>
              <button class="lab-btn-outline" id="lab-btn-record" type="button">
                ${icons.video(16)}
                <span id="lab-record-text">${this.t.btnRecord}</span>
              </button>
            </div>
          </div>

          <!-- Список прикрепленных файлов (до 5 скриншотов + видео) -->
          <div class="lab-attachments-list" id="lab-attachments"></div>
        </div>

        <!-- Экран успеха -->
        <div class="lab-success-view" id="lab-success-view">
          <div class="lab-success-icon">${icons.check(26)}</div>
          <h2 style="margin: 0 0 6px 0; font-size: 18px;" id="lab-success-title">${this.t.successTitle}</h2>
          <p style="color: var(--lab-text-muted); font-size: 13px; margin: 0;" id="lab-success-desc">${this.t.successDesc}</p>
          <div class="lab-ref-badge" id="lab-ref-badge"></div>
          
          <div class="lab-success-actions">
            <button class="lab-btn-secondary" id="lab-btn-new-report" type="button">${this.t.btnNewReport}</button>
            <button class="lab-btn-primary" id="lab-btn-done" type="button">${this.t.btnClose}</button>
          </div>
        </div>

        <!-- Нижняя панель отправки с прогресс-баром -->
        <div class="lab-footer" id="lab-footer">
          <div class="lab-progress-container" id="lab-progress-container">
            <div class="lab-progress-bar" id="lab-progress-bar"></div>
          </div>
          <button class="lab-submit-btn" id="lab-submit-btn">
            <span id="lab-submit-text">${this.t.submitBtn}</span>
          </button>
        </div>
      </div>
    `;

    this.shadow.appendChild(container);
    this.bindElements();
  }

  private bindElements(): void {
    if (!this.shadow) return;

    this.launcherBtn = this.shadow.getElementById('lab-launcher') as HTMLButtonElement;
    this.backdrop = this.shadow.getElementById('lab-backdrop') as HTMLDivElement;
    this.sidebar = this.shadow.getElementById('lab-sidebar') as HTMLDivElement;
    this.formView = this.shadow.getElementById('lab-form-view') as HTMLDivElement;
    this.successView = this.shadow.getElementById('lab-success-view') as HTMLDivElement;
    this.footerEl = this.shadow.getElementById('lab-footer') as HTMLDivElement;
    this.titleInput = this.shadow.getElementById('lab-title') as HTMLInputElement;
    this.descInput = this.shadow.getElementById('lab-desc') as HTMLTextAreaElement;
    this.attachmentsList = this.shadow.getElementById('lab-attachments') as HTMLDivElement;
    this.submitBtn = this.shadow.getElementById('lab-submit-btn') as HTMLButtonElement;
    this.screenshotBtn = this.shadow.getElementById('lab-btn-screenshot') as HTMLButtonElement;
    this.screenshotBtnText = this.shadow.getElementById('lab-btn-screenshot-text') as HTMLSpanElement;
    this.recordBtn = this.shadow.getElementById('lab-btn-record') as HTMLButtonElement;
    this.recordBtnText = this.shadow.getElementById('lab-record-text') as HTMLSpanElement;
    this.refBadge = this.shadow.getElementById('lab-ref-badge') as HTMLElement;

    this.progressContainer = this.shadow.getElementById('lab-progress-container') as HTMLDivElement;
    this.progressBar = this.shadow.getElementById('lab-progress-bar') as HTMLDivElement;
    this.errorBanner = this.shadow.getElementById('lab-error-banner') as HTMLDivElement;
    this.errorTextEl = this.shadow.getElementById('lab-error-text') as HTMLSpanElement;

    // Плавающая плашка записи
    this.recordingBar = this.shadow.getElementById('lab-recording-bar') as HTMLDivElement;
    this.barTimerEl = this.shadow.getElementById('lab-bar-timer') as HTMLSpanElement;
    this.barStopBtn = this.shadow.getElementById('lab-bar-stop') as HTMLButtonElement;

    // Сегментированный переключатель со скользящей анимацией
    const indicator = this.shadow.getElementById('lab-type-indicator') as HTMLDivElement;
    const typeBtns = this.shadow.querySelectorAll('.lab-type-btn');
    typeBtns.forEach((btn, index) => {
      this.typeButtons.push(btn as HTMLButtonElement);
      btn.addEventListener('click', () => {
        this.typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentType = btn.getAttribute('data-type') as any;
        if (indicator) {
          indicator.style.transform = `translateX(${index * 100}%)`;
        }
      });
    });

    // Открытие/закрытие
    this.launcherBtn.addEventListener('click', () => this.open());
    this.backdrop.addEventListener('click', () => this.close());
    this.shadow.getElementById('lab-close')?.addEventListener('click', () => this.close());

    this.shadow.getElementById('lab-btn-done')?.addEventListener('click', () => {
      this.resetForm();
      this.close();
    });

    this.shadow.getElementById('lab-btn-new-report')?.addEventListener('click', () => {
      this.resetForm();
    });

    // Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
        this.close();
      }
    });

    // Скриншот (до 5 штук)
    this.screenshotBtn.addEventListener('click', async () => {
      if (this.currentScreenshots.length >= 5) return;
      if (!this.onScreenshotCallback) return;

      this.sidebar.style.display = 'none';
      this.backdrop.style.display = 'none';

      try {
        const blob = await this.onScreenshotCallback();
        this.currentScreenshots.push(blob);
        this.renderAttachments();
      } catch (err) {
        console.error('[LabReporter] Ошибка скриншота:', err);
      } finally {
        this.sidebar.style.display = 'flex';
        this.backdrop.style.display = 'block';
      }
    });

    // Запись экрана
    this.recordBtn.addEventListener('click', () => this.handleToggleRecording());
    this.barStopBtn.addEventListener('click', () => this.handleToggleRecording());

    this.titleInput.addEventListener('input', () => {
      this.titleInput.style.borderColor = '';
    });

    // Отправка формы (с прогресс-баром и Retry вместо alert)
    this.submitBtn.addEventListener('click', async () => {
      const title = this.titleInput.value.trim();
      if (!title) {
        this.titleInput.focus();
        this.titleInput.style.borderColor = 'var(--lab-danger)';
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

      const submitTextEl = this.shadow?.getElementById('lab-submit-text');
      if (submitTextEl) submitTextEl.innerText = this.t.submittingText;

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
      } catch (err: any) {
        // Ошибка: НЕ используем alert()!
        // Сохраняем черновик формы и превращаем кнопку в Retry!
        this.progressContainer.classList.remove('active');
        this.progressBar.style.width = '0%';
        this.showError(this.describeSubmitError(err));
      }
    });
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
    this.submitBtn.classList.add('retry-mode');
    const submitTextEl = this.shadow?.getElementById('lab-submit-text');
    if (submitTextEl) {
      submitTextEl.innerText = `↻ ${this.t.retryBtn}`;
    }
  }

  private hideError(): void {
    this.isRetryMode = false;
    this.errorBanner.classList.add('hidden');
    this.submitBtn.classList.remove('retry-mode');
    const submitTextEl = this.shadow?.getElementById('lab-submit-text');
    if (submitTextEl) {
      submitTextEl.innerText = this.t.submitBtn;
    }
  }

  private updateTexts(): void {
    if (!this.shadow) return;
    const el = (id: string) => this.shadow?.getElementById(id);

    const launcher = el('lab-launcher-text');
    if (launcher) launcher.innerText = this.t.launcherText;

    const stopText = el('lab-bar-stop-text');
    if (stopText) stopText.innerText = this.t.btnRecordStop;
    this.recordBtnText.innerText = this.isRecording ? this.t.btnRecordStop : this.t.btnRecord;
    el('lab-close')?.setAttribute('title', this.t.btnClose);
    el('lab-close')?.setAttribute('aria-label', this.t.btnClose);

    const header = el('lab-header-title');
    if (header) header.innerText = this.t.headerTitle;

    const bBug = el('lab-type-bug'); if (bBug) bBug.innerText = this.t.typeBug;
    const bFeat = el('lab-type-feature'); if (bFeat) bFeat.innerText = this.t.typeFeature;
    const bQuest = el('lab-type-question'); if (bQuest) bQuest.innerText = this.t.typeQuestion;

    const lTitle = el('lab-label-title'); if (lTitle) lTitle.innerText = this.t.titleLabel;
    this.titleInput.placeholder = this.t.titlePlaceholder;

    const lDesc = el('lab-label-desc'); if (lDesc) lDesc.innerText = this.t.descLabel;
    this.descInput.placeholder = this.t.descPlaceholder;

    const lAttach = el('lab-label-attachments'); if (lAttach) lAttach.innerText = this.t.attachmentsLabel;
    const sDone = el('lab-btn-done'); if (sDone) sDone.innerText = this.t.btnClose;
    const sNew = el('lab-btn-new-report'); if (sNew) sNew.innerText = this.t.btnNewReport;

    const sTitle = el('lab-success-title'); if (sTitle) sTitle.innerText = this.t.successTitle;
    const sDesc = el('lab-success-desc'); if (sDesc) sDesc.innerText = this.t.successDesc;

    if (!this.isRetryMode) {
      const sSubmit = el('lab-submit-text'); if (sSubmit) sSubmit.innerText = this.t.submitBtn;
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
    this.currentVideo = result.blob;
    this.currentVideoDuration = result.durationMs;
    this.recordingStartTime = result.startTime;
    this.isRecording = false;
    this.recordBtnText.innerText = this.t.btnRecord;
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

    // Проверяем лимит скриншотов (до 5)
    if (this.currentScreenshots.length >= 5) {
      this.screenshotBtn.disabled = true;
      this.screenshotBtnText.innerText = `${this.t.btnScreenshot} (5/5)`;
    } else {
      this.screenshotBtn.disabled = false;
      this.screenshotBtnText.innerText = this.currentScreenshots.length > 0 
        ? `${this.t.btnScreenshot} (${this.currentScreenshots.length}/5)`
        : this.t.btnScreenshot;
    }

    // Список скриншотов
    this.currentScreenshots.forEach((blob, idx) => {
      const item = document.createElement('div');
      item.className = 'lab-attachment-item';
      item.innerHTML = `
        <div class="lab-attachment-name">
          ${icons.image(14)}
          <span>${this.t.screenshotItem} ${idx + 1} (${(blob.size / 1024).toFixed(0)} KB)</span>
        </div>
        <button class="lab-btn-remove" data-idx="${idx}">${this.t.removeAttachment}</button>
      `;
      item.querySelector('button')?.addEventListener('click', () => {
        this.currentScreenshots.splice(idx, 1);
        this.renderAttachments();
      });
      this.attachmentsList.appendChild(item);
    });

    // Видео (с предварительным просмотром Preview before submit по ТЗ)
    if (this.currentVideo) {
      const item = document.createElement('div');
      item.className = 'lab-attachment-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
      row.innerHTML = `
        <div class="lab-attachment-name">
          ${icons.video(14)}
          <span>${this.t.videoItem} (${(this.currentVideoDuration / 1000).toFixed(0)}s)</span>
        </div>
        <button class="lab-btn-remove" id="del-video" type="button">${this.t.removeAttachment}</button>
      `;
      item.appendChild(row);

      const videoPreview = document.createElement('video');
      videoPreview.controls = true;
      videoPreview.src = URL.createObjectURL(this.currentVideo);
      videoPreview.style.cssText = 'width: 100%; max-height: 140px; border-radius: var(--lab-radius-md); margin-top: 8px; background: #000; display: block;';
      item.appendChild(videoPreview);

      row.querySelector('#del-video')?.addEventListener('click', () => {
        URL.revokeObjectURL(videoPreview.src);
        this.currentVideo = null;
        this.currentVideoDuration = 0;
        this.recordingStartTime = 0;
        this.renderAttachments();
      });
      this.attachmentsList.appendChild(item);
    }
  }

  showLauncher(): void {
    this.launcherBtn.classList.remove('hidden');
  }

  hideLauncher(): void {
    this.launcherBtn.classList.add('hidden');
  }

  open(): void {
    this.sidebar.classList.add('open');
    this.backdrop.classList.add('open');
  }

  close(): void {
    this.sidebar.classList.remove('open');
    this.backdrop.classList.remove('open');
  }

  showSuccess(refId: string): void {
    this.formView.style.display = 'none';
    this.footerEl.style.display = 'none';
    this.successView.style.display = 'flex';
    this.refBadge.innerText = refId;
  }

  resetForm(): void {
    this.titleInput.value = '';
    this.titleInput.style.borderColor = 'var(--lab-border)';
    this.descInput.value = '';
    this.currentScreenshots = [];
    this.currentVideo = null;
    this.currentVideoDuration = 0;
    this.recordingStartTime = 0;
    this.currentType = 'bug';

    // Сброс переключателя типа
    const indicator = this.shadow?.getElementById('lab-type-indicator') as HTMLDivElement;
    if (indicator) indicator.style.transform = 'translateX(0%)';
    this.typeButtons.forEach((b, i) => b.classList.toggle('active', i === 0));

    this.hideError();
    this.renderAttachments();
    this.formView.style.display = 'flex';
    this.footerEl.style.display = 'flex';
    this.successView.style.display = 'none';
    this.submitBtn.disabled = false;
    this.submitBtn.innerHTML = `<span id="lab-submit-text">${this.t.submitBtn}</span>`;
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
