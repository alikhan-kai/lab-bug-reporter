import { widgetStyles } from './tokens.css';

export interface ReportFormData {
  type: 'bug' | 'feature' | 'question';
  title: string;
  description: string;
  screenshot?: Blob;
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
  private recordBtn!: HTMLButtonElement;
  private refBadge!: HTMLElement;

  // Плавающая плашка записи экрана (в стиле Jam.dev)
  private recordingBar!: HTMLDivElement;
  private barTimerEl!: HTMLSpanElement;
  private barStopBtn!: HTMLButtonElement;

  // Состояние
  private currentType: 'bug' | 'feature' | 'question' = 'bug';
  private currentScreenshot: Blob | null = null;
  private currentVideo: Blob | null = null;
  private currentVideoDuration: number = 0;
  private recordingStartTime: number = 0;
  private isRecording: boolean = false;
  private timerInterval: any = null;

  // Callbacks
  private onScreenshotCallback?: () => Promise<Blob>;
  private onStartRecordingCallback?: () => Promise<number>;
  private onStopRecordingCallback?: () => Promise<{ blob: Blob; durationMs: number; startTime: number }>;
  private onSubmitCallback?: (data: ReportFormData) => Promise<string>;

  constructor() {
    this.initDOM();
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
        <span>Помощь</span>
      </button>

      <!-- ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАПИСИ (Jam.dev стиль, сверху экрана) -->
      <div class="lab-recording-bar hidden" id="lab-recording-bar">
        <div class="lab-rec-dot"></div>
        <span class="lab-rec-time" id="lab-bar-timer">0:00</span>
        <button class="lab-bar-stop-btn" id="lab-bar-stop" type="button">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect width="18" height="18" rx="2"></rect>
          </svg>
          <span>Завершить запись</span>
        </button>
      </div>

      <!-- Затемнение фона -->
      <div class="lab-backdrop" id="lab-backdrop"></div>

      <!-- Выезжающий сайдбар -->
      <div class="lab-sidebar" id="lab-sidebar">
        <div class="lab-header">
          <h2>Сообщить о проблеме</h2>
          <button class="lab-close-btn" id="lab-close" title="Закрыть (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Форма -->
        <div class="lab-body" id="lab-form-view">
          <!-- Тип отчета (БЕЗ смайликов, аккуратный segmented control) -->
          <div class="lab-type-selector">
            <button class="lab-type-btn active" data-type="bug">Баг</button>
            <button class="lab-type-btn" data-type="feature">Предложение</button>
            <button class="lab-type-btn" data-type="question">Вопрос</button>
          </div>

          <!-- Заголовок -->
          <div class="lab-field">
            <label>Тема проблемы *</label>
            <input type="text" class="lab-input" id="lab-title" placeholder="Кратко опишите проблему..." />
          </div>

          <!-- Описание -->
          <div class="lab-field">
            <label>Описание</label>
            <textarea class="lab-textarea" id="lab-desc" placeholder="Что произошло или как повторить сбой..."></textarea>
          </div>

          <!-- Кнопки захвата медиа -->
          <div class="lab-field">
            <label>Вложения</label>
            <div class="lab-media-actions">
              <button class="lab-btn-outline" id="lab-btn-screenshot" type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Скриншот</span>
              </button>
              <button class="lab-btn-outline" id="lab-btn-record" type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span id="lab-record-text">Запись экрана</span>
              </button>
            </div>
          </div>

          <!-- Список прикрепленных файлов -->
          <div class="lab-attachments-list" id="lab-attachments"></div>
        </div>

        <!-- Экран успеха -->
        <div class="lab-success-view" id="lab-success-view">
          <div class="lab-success-icon">✓</div>
          <h2 style="margin: 0 0 6px 0; font-size: 18px;">Отчет отправлен!</h2>
          <p style="color: var(--lab-text-muted); font-size: 13px; margin: 0;">Команда лаборатории получила информацию.</p>
          <div class="lab-ref-badge" id="lab-ref-badge">REF-00000</div>
          
          <div class="lab-success-actions">
            <button class="lab-btn-secondary" id="lab-btn-new-report" type="button">+ Новый отчет</button>
            <button class="lab-btn-primary" id="lab-btn-done" type="button">Закрыть</button>
          </div>
        </div>

        <!-- Нижняя панель отправки -->
        <div class="lab-footer" id="lab-footer">
          <button class="lab-submit-btn" id="lab-submit-btn">
            <span>Отправить отчет</span>
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
    this.recordBtn = this.shadow.getElementById('lab-btn-record') as HTMLButtonElement;
    this.refBadge = this.shadow.getElementById('lab-ref-badge') as HTMLElement;

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

    // Кнопки экрана успеха
    this.shadow.getElementById('lab-btn-done')?.addEventListener('click', () => {
      this.resetForm();
      this.close();
    });

    this.shadow.getElementById('lab-btn-new-report')?.addEventListener('click', () => {
      this.resetForm();
    });

    // Клавиша Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
        this.close();
      }
    });

    // Скриншот
    this.screenshotBtn.addEventListener('click', async () => {
      if (!this.onScreenshotCallback) return;
      this.sidebar.style.display = 'none';
      this.backdrop.style.display = 'none';

      try {
        const blob = await this.onScreenshotCallback();
        this.currentScreenshot = blob;
        this.renderAttachments();
      } catch (err) {
        console.error('[LabReporter] Ошибка скриншота:', err);
      } finally {
        this.sidebar.style.display = 'flex';
        this.backdrop.style.display = 'block';
      }
    });

    // Запуск записи из формы
    this.recordBtn.addEventListener('click', () => this.handleToggleRecording());

    // Остановка записи с верхней плавающей плашки
    this.barStopBtn.addEventListener('click', () => this.handleToggleRecording());

    // Отправка
    this.submitBtn.addEventListener('click', async () => {
      const title = this.titleInput.value.trim();
      if (!title) {
        this.titleInput.focus();
        this.titleInput.style.borderColor = 'var(--lab-danger)';
        return;
      }

      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = `<span>Отправка...</span>`;

      try {
        let refId = 'REF-' + Math.floor(10000 + Math.random() * 90000);
        if (this.onSubmitCallback) {
          refId = await this.onSubmitCallback({
            type: this.currentType,
            title,
            description: this.descInput.value.trim(),
            screenshot: this.currentScreenshot || undefined,
            video: this.currentVideo || undefined,
            videoDurationMs: this.currentVideoDuration || undefined,
            recordingStartTime: this.recordingStartTime || undefined
          });
        }

        this.showSuccess(refId);
      } catch (err: any) {
        alert('Ошибка при отправке: ' + err.message);
        this.submitBtn.disabled = false;
        this.submitBtn.innerHTML = `<span>Отправить отчет</span>`;
      }
    });
  }

  private async handleToggleRecording(): Promise<void> {
    if (this.isRecording) {
      // Останавливаем запись
      if (this.onStopRecordingCallback) {
        try {
          const res = await this.onStopRecordingCallback();
          this.currentVideo = res.blob;
          this.currentVideoDuration = res.durationMs;
          this.recordingStartTime = res.startTime;
          this.isRecording = false;
          this.stopRecordBar();
          this.renderAttachments();
          // Автоматически снова открываем сайдбар!
          this.open();
        } catch (err) {
          console.error('[LabReporter] Ошибка остановки записи:', err);
        }
      }
    } else {
      // Запускаем запись
      if (this.onStartRecordingCallback) {
        try {
          this.recordingStartTime = await this.onStartRecordingCallback();
          this.isRecording = true;
          // Закрываем сайдбар и открываем верхнюю плавающую панель!
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

    if (this.currentScreenshot) {
      const item = document.createElement('div');
      item.className = 'lab-attachment-item';
      item.innerHTML = `
        <div class="lab-attachment-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Скриншот (${(this.currentScreenshot.size / 1024).toFixed(0)} КБ)</span>
        </div>
        <button class="lab-btn-remove" id="del-screen">Удалить</button>
      `;
      item.querySelector('#del-screen')?.addEventListener('click', () => {
        this.currentScreenshot = null;
        this.renderAttachments();
      });
      this.attachmentsList.appendChild(item);
    }

    if (this.currentVideo) {
      const item = document.createElement('div');
      item.className = 'lab-attachment-item';
      item.innerHTML = `
        <div class="lab-attachment-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>Видеозапись (${(this.currentVideoDuration / 1000).toFixed(0)} сек)</span>
        </div>
        <button class="lab-btn-remove" id="del-video">Удалить</button>
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
    this.currentScreenshot = null;
    this.currentVideo = null;
    this.currentVideoDuration = 0;
    this.recordingStartTime = 0;
    this.renderAttachments();
    this.formView.style.display = 'flex';
    this.footerEl.style.display = 'flex';
    this.successView.style.display = 'none';
    this.submitBtn.disabled = false;
    this.submitBtn.innerHTML = `<span>Отправить отчет</span>`;
  }

  onScreenshot(cb: () => Promise<Blob>): void { this.onScreenshotCallback = cb; }
  onStartRecording(cb: () => Promise<number>): void { this.onStartRecordingCallback = cb; }
  onStopRecording(cb: () => Promise<{ blob: Blob; durationMs: number; startTime: number }>): void { this.onStopRecordingCallback = cb; }
  onSubmit(cb: (data: ReportFormData) => Promise<string>): void { this.onSubmitCallback = cb; }
}
