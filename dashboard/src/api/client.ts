import { ReportItem, ReportStatus, ReportType, ConsoleEntry, NetworkEntry, BreadcrumbEntry } from '../types';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  projects: string[];
}

export interface ReportFilterParams {
  project?: string;
  status?: string;
  type?: string;
  q?: string;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Получение информации о текущем пользователе и его ролях (Keycloak OIDC)
   * GET /api/me
   */
  async getMe(): Promise<CurrentUser> {
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Бэкенд пока не запущен — возвращаем дефолтного админа для интерфейса
    }

    return {
      id: "u-dev-admin",
      name: "Assylbek Sabyrzhan",
      email: "assylbek@sdu.edu.kz",
      roles: ["admin"],
      projects: ["sdu-portal", "sdu-library"]
    };
  }

  /**
   * Список отчетов с фильтрацией и поиском
   * GET /api/reports?project=&status=&type=&q=
   */
  async getReports(params: ReportFilterParams = {}): Promise<ReportItem[]> {
    const query = new URLSearchParams();
    if (params.project && params.project !== 'all') query.set('project', params.project);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.q) query.set('q', params.q);

    try {
      const res = await fetch(`${API_BASE}/api/reports?${query.toString()}`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Если бэкенд не запущен, считываем отчеты из локального хранилища (сохраненные с demo-сайта)
    }

    return this.getLocalReports(params);
  }

  /**
   * Детальная информация по одному отчету
   * GET /api/reports/{id}
   */
  async getReport(id: string): Promise<ReportItem> {
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const report = await res.json();
        // Загружаем контекст
        const context = await this.getReportContext(id);
        return {
          ...report,
          console: context.console,
          network: context.network,
          breadcrumbs: context.breadcrumbs
        };
      }
    } catch {}

    const local = this.getLocalReports({}).find(r => r.id === id);
    if (local) return local;

    throw new Error(`Отчет ${id} не найден`);
  }

  /**
   * Загрузка логов консоли, сети и действий отчета
   * GET /api/reports/{id}/context
   */
  async getReportContext(id: string): Promise<{
    console: ConsoleEntry[];
    network: NetworkEntry[];
    breadcrumbs: BreadcrumbEntry[];
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}/context`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const local = this.getLocalReports({}).find(r => r.id === id);
    return {
      console: local?.console || [],
      network: local?.network || [],
      breadcrumbs: local?.breadcrumbs || []
    };
  }

  /**
   * Изменение статуса отчета (требуется роль triager или admin)
   * PATCH /api/reports/{id}
   */
  async updateReportStatus(id: string, status: ReportStatus): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Ошибка смены статуса: ${res.status}`);
      }
    } catch {}

    // Обновляем в локальном хранилище
    const all = this.getLocalReports({});
    const updated = all.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem('lab_reports_storage', JSON.stringify(updated));
  }

  /**
   * Удаление отчета и файлов (требуется роль admin)
   * DELETE /api/reports/{id}
   */
  async deleteReport(id: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Ошибка удаления: ${res.status}`);
      }
    } catch {}

    const all = this.getLocalReports({});
    const filtered = all.filter(r => r.id !== id);
    localStorage.setItem('lab_reports_storage', JSON.stringify(filtered));
  }

  /**
   * Ссылка на вложение (видео/скриншот)
   * GET /api/reports/{id}/attachments/{aid}
   */
  getAttachmentUrl(reportId: string, attachmentId: string): string {
    return `${API_BASE}/api/reports/${reportId}/attachments/${attachmentId}`;
  }

  /**
   * Локальное хранилище для интеграции с demo-сайтом до запуска Spring Boot
   */
  private getLocalReports(params: ReportFilterParams): ReportItem[] {
    const raw = localStorage.getItem('lab_reports_storage');
    let list: ReportItem[] = [];

    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {}
    }

    // Если пусто — инициализируем начальными данными для проверки XSS и ролей
    if (list.length === 0) {
      const now = Date.now();
      const start = now - 1000 * 60 * 12;

      list = [
        {
          id: "REP-10492",
          projectSlug: "sdu-portal",
          projectName: "SDU Student Portal",
          type: "bug" as ReportType,
          title: "Сбой платежного шлюза Kaspi (код ошибки 500)",
          description: "Нажал оплатить общежитие, кнопка зависла и вылезла ошибка 500. Проверьте обработку ответа от банка.",
          status: "new" as ReportStatus,
          createdAt: new Date(start).toISOString(),
          pageUrl: "https://portal.sdu.edu.kz/payments",
          reporter: { id: "u-1842", email: "alice@sdu.edu.kz" },
          recordingStartTime: start,
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          screenshotUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
          environment: {
            url: "https://portal.sdu.edu.kz/payments",
            referrer: "https://portal.sdu.edu.kz/dashboard",
            user_agent: "Mozilla/5.0 Chrome/152.0 Windows",
            browser: "Chrome 152",
            os: "Windows 11",
            viewport: [1920, 1080],
            screen_size: [1920, 1080],
            device_pixel_ratio: 1,
            language: "ru-RU",
            timezone: "Asia/Almaty",
            client_time: new Date(start).toISOString(),
            online: true
          },
          hostMetadata: { app_version: "2.15.0" },
          console: [
            {
              t: start + 2100,
              level: "log",
              message: "[SDU Portal] Initialized payment component"
            },
            {
              t: start + 4800,
              level: "error",
              // ТЕСТ НА XSS: проверяем, что <img src=x onerror=...> выводится безопасно текстом!
              message: "PaymentGatewayException: <img src=x onerror=alert('xss')> Ошибка соединения с Kaspi API",
              stack: "PaymentGatewayException: Kaspi API timeout\n  at KaspiClient.checkout (payments.js:142:19)\n  at HTMLButtonElement.handlePay (portal.js:88:5)"
            }
          ],
          network: [
            {
              t_start: start + 800,
              duration_ms: 240,
              method: "GET",
              url: "https://portal.sdu.edu.kz/api/v1/user/dues",
              status: 200,
              initiator: "fetch",
              request: { headers: { "authorization": "[REDACTED]" }, body: "", body_truncated: false },
              response: { headers: {}, body: "{\"dorm_fee\": 45000}", body_truncated: false }
            },
            {
              t_start: start + 4750,
              duration_ms: 1950,
              method: "POST",
              url: "https://portal.sdu.edu.kz/api/v1/checkout/kaspi",
              status: 500,
              initiator: "fetch",
              request: { headers: { "authorization": "[REDACTED]" }, body: "{\"amount\": 45000}", body_truncated: false },
              response: { headers: {}, body: "{\"error\": \"Kaspi connection timeout\"}", body_truncated: false },
              error: "HTTP 500 Internal Server Error"
            },
            // Зависший запрос
            {
              t_start: start + 4800,
              duration_ms: 7200,
              method: "GET",
              url: "https://portal.sdu.edu.kz/api/v1/retry_status",
              status: null,
              pending: true,
              initiator: "fetch",
              request: { headers: {}, body: "", body_truncated: false }
            }
          ],
          breadcrumbs: [
            { t: start + 600, kind: "navigation", url: "https://portal.sdu.edu.kz/payments" },
            { t: start + 4700, kind: "click", target: "button#btn-pay.danger", text: "Оплатить общежитие" }
          ]
        }
      ];

      localStorage.setItem('lab_reports_storage', JSON.stringify(list));
    }

    return list.filter(r => {
      if (params.project && params.project !== 'all' && r.projectSlug !== params.project) return false;
      if (params.status && params.status !== 'all' && r.status !== params.status) return false;
      if (params.type && params.type !== 'all' && r.type !== params.type) return false;
      if (params.q) {
        const q = params.q.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.reporter.email.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      }
      return true;
    });
  }
}

export const apiClient = new ApiClient();
