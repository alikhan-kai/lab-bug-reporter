import { widgetStyles } from './tokens.css';
import { detectLanguage, getTranslations, SupportedLang, Translations } from '../core/i18n';

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

  // Callbacks
  private onScreenshotCallback?: () => Promise<Blob>;
  private onStartRecordingCallback?: (options?: { microphone?: boolean }) => Promise<number>;
  private onStopRecordingCallback?: () => Promise<{ blob: Blob; durationMs: number; startTime: number }>;
  private onSubmitCallback?: (data: ReportFormData, onProgress: (percent: number) => void) => Promise<string>;

  constructor(preferredLang?: string) {
    this.lang = detectLanguage(preferredLang);
    this.t = getTranslations(this.lang);
    this.initDOM();
  }

  setLanguage(lang: SupportedLang): void {
    this.lang = lang;
    this.t = getTranslations(lang);
    this.updateTexts();
  }

  private initDOM(): void {
    if (typeof document === 'undefined') return;

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span id="lab-launcher-text">${this.t.launcherText}</span>
      </button>

      <!-- ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАПИСИ (Jam.dev стиль) -->
      <div class="lab-recording-bar hidden" id="lab-recording-bar">
        <div class="lab-rec-dot"></div>
        <span class="lab-rec-time" id="lab-bar-timer">0:00</span>
        <button class="lab-bar-stop-btn" id="lab-bar-stop" type="button">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect width="18" height="18" rx="2"></rect>
          </svg>
          <span id="lab-bar-stop-text">${this.t.btnRecordStop}</span>
        </button>
      </div>

      <!-- Затемнение фона -->
      <div class="lab-backdrop" id="lab-backdrop"></div>

      <!-- Выезжающий сайдбар -->
      <div class="lab-sidebar" id="lab-sidebar">
        <div class="lab-header">
          <h2 id="lab-header-title">${this.t.headerTitle}</h2>
          <button class="lab-close-btn" id="lab-close" title="Закрыть (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Форма -->
        <div class="lab-body" id="lab-form-view">
          <!-- Блок ошибки загрузки (Inline Error с Retry) -->
          <div class="lab-error-banner hidden" id="lab-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span id="lab-error-text">${this.t.errorUploadText}</span>
          </div>

          <!-- Тип отчета -->
          <div class="lab-type-selector">
            <button class="lab-type-btn active" data-type="bug" id="lab-type-bug">${this.t.typeBug}</button>
            <button class="lab-type-btn" data-type="feature" id="lab-type-feature">${this.t.typeFeature}</button>
            <button class="lab-type-btn" data-type="question" id="lab-type-question">${this.t.typeQuestion}</button>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span id="lab-btn-screenshot-text">${this.t.btnScreenshot}</span>
              </button>
              <button class="lab-btn-outline" id="lab-btn-record" type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span id="lab-record-text">${this.t.btnRecord}</span>
              </button>
            </div>
          </div>

          <!-- Список прикрепленных файлов (до 5 скриншотов + видео) -->
          <div class="lab-attachments-list" id="lab-attachments"></div>
        </div>

        <!-- Экран успеха -->
        <div class="lab-success-view" id="lab-success-view">
          <div class="lab-success-icon">✓</div>
          <h2 style="margin: 0 0 6px 0; font-size: 18px;" id="lab-success-title">${this.t.successTitle}</h2>
          <p style="color: var(--lab-text-muted); font-size: 13px; margin: 0;" id="lab-success-desc">${this.t.successDesc}</p>
          <div class="lab-ref-badge" id="lab-ref-badge">REF-00000</div>
          
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

    // Сегментированный переключатель
    const typeBtns = this.shadow.querySelectorAll('.lab-type-btn');
    typeBtns.forEach(btn => {
      this.typeButtons.push(btn as HTMLButtonElement);
      btn.addEventListener('click', () => {
        this.typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentType = btn.getAttribute('data-type') as any;
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

    // Отправка формы (с прогресс-баром и Retry вместо alert)
    this.submitBtn.addEventListener('click', async () => {
      const title = this.titleInput.value.trim();
      if (!title) {
        this.titleInput.focus();
        this.titleInput.style.borderColor = 'var(--lab-danger)';
        return;
      }

      this.hideError();
      this.submitBtn.disabled = true;
      this.progressContainer.classList.add('active');
      this.progressBar.style.width = '15%';

      const submitTextEl = this.shadow?.getElementById('lab-submit-text');
      if (submitTextEl) submitTextEl.innerText = this.t.submittingText;

      try {
        let refId = 'REF-' + Math.floor(10000 + Math.random() * 90000);
        if (this.onSubmitCallback) {
          refId = await this.onSubmitCallback({
            type: this.currentType,
            title,
            description: this.descInput.value.trim(),
            screenshots: [...this.currentScreenshots],
            video: this.currentVideo || undefined,
            videoDurationMs: this.currentVideoDuration || undefined,
            recordingStartTime: this.recordingStartTime || undefined
          }, (percent: number) => {
            this.progressBar.style.width = `${Math.min(95, Math.max(15, percent))}%`;
          });
        }

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
        this.showError(err.message || this.t.errorUploadText);
      }
    });
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
      if (this.onStopRecordingCallback) {
        try {
          const res = await this.onStopRecordingCallback();
          this.currentVideo = res.blob;
          this.currentVideoDuration = res.durationMs;
          this.recordingStartTime = res.startTime;
          this.isRecording = false;
          this.stopRecordBar();
          this.renderAttachments();
          this.open();
        } catch (err) {
          console.error('[LabReporter] Ошибка остановки записи:', err);
        }
      }
    } else {
      if (this.onStartRecordingCallback) {
        try {
          // Вызываем с объектом { microphone: true }
          this.recordingStartTime = await this.onStartRecordingCallback({ microphone: true });
          this.isRecording = true;
          this.close();
          this.startRecordBar();
        } catch (err) {
          console.error('[LabReporter] Ошибка старта записи:', err);
        }
      }
    }
  }

  private startRecordBar(): void {
    let seconds = 0;
    this.recordingBar.classList.remove('hidden');
    this.barTimerEl.innerText = '0:00';

    this.timerInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.barTimerEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }, 1000);
  }

  private stopRecordBar(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.recordingBar.classList.add('hidden');
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
          </svg>
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

    // Видео
    if (this.currentVideo) {
      const item = document.createElement('div');
      item.className = 'lab-attachment-item';
      item.innerHTML = `
        <div class="lab-attachment-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>${this.t.videoItem} (${(this.currentVideoDuration / 1000).toFixed(0)}s)</span>
        </div>
        <button class="lab-btn-remove" id="del-video">${this.t.removeAttachment}</button>
      `;
      item.querySelector('#del-video')?.addEventListener('click', () => {
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
  onStopRecording(cb: () => Promise<{ blob: Blob; durationMs: number; startTime: number }>): void { this.onStopRecordingCallback = cb; }
  onSubmit(cb: (data: ReportFormData, onProgress: (percent: number) => void) => Promise<string>): void { this.onSubmitCallback = cb; }
}
