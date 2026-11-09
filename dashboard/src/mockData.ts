import { ReportItem } from './types';

const now = Date.now();
const start1 = now - 1000 * 60 * 15; // 15 минут назад

export const initialReports: ReportItem[] = [
  {
    id: "REP-10492",
    projectSlug: "sdu-portal",
    projectName: "SDU Student Portal",
    type: "bug",
    title: "Не удалось оплатить общежитие — ошибка Kaspi (код 500)",
    description: "Нажимаю кнопку 'Оплатить общежитие', вылетает ошибка и платеж не проходит. Деньги списались, но статус не обновился.",
    status: "new",
    createdAt: new Date(start1).toISOString(),
    pageUrl: "https://portal.sdu.edu.kz/payments",
    reporter: {
      id: "u-1842",
      email: "alice@sdu.edu.kz"
    },
    recordingStartTime: start1,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    screenshotUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    environment: {
      url: "https://portal.sdu.edu.kz/payments",
      referrer: "https://portal.sdu.edu.kz/dashboard",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152.0.0.0",
      browser: "Chrome 152",
      os: "Windows 11",
      viewport: [1920, 1080],
      screen_size: [1920, 1080],
      device_pixel_ratio: 1,
      language: "ru-RU",
      timezone: "Asia/Almaty",
      client_time: new Date(start1).toISOString(),
      online: true
    },
    hostMetadata: {
      app_version: "2.14.0",
      commit_hash: "7f4c91a",
      feature_flags: ["kaspi_v2_checkout", "new_dorm_system"]
    },
    console: [
      {
        t: start1 + 1200,
        level: "log",
        message: "[SDU Portal] Loaded payments module v2.14.0"
      },
      {
        t: start1 + 4200,
        level: "error",
        message: "PaymentGatewayException: Не удалось связаться с банком Kaspi (код ошибки 500)",
        stack: "PaymentGatewayException: Не удалось связаться с банком Kaspi\n  at KaspiClient.checkout (payments.js:142:19)\n  at HTMLButtonElement.handlePay (portal.js:88:5)"
      },
      {
        t: start1 + 4250,
        level: "warn",
        message: "[Telemetry] Reported transaction failure for user u-1842"
      }
    ],
    network: [
      {
        t_start: start1 + 800,
        duration_ms: 210,
        method: "GET",
        url: "https://portal.sdu.edu.kz/api/v1/user/dues",
        status: 200,
        initiator: "fetch",
        request: {
          headers: { "authorization": "[REDACTED]", "accept": "application/json" },
          body: "",
          body_truncated: false
        },
        response: {
          headers: { "content-type": "application/json" },
          body: "{\"dorm_fee\": 45000, \"status\": \"unpaid\"}",
          body_truncated: false
        }
      },
      {
        t_start: start1 + 4180,
        duration_ms: 1850,
        method: "POST",
        url: "https://portal.sdu.edu.kz/api/v1/checkout/kaspi",
        status: 500,
        initiator: "fetch",
        request: {
          headers: { "authorization": "[REDACTED]", "content-type": "application/json" },
          body: "{\"amount\": 45000, \"payment_token\": \"[REDACTED]\"}",
          body_truncated: false
        },
        response: {
          headers: { "content-type": "application/json" },
          body: "{\"error\": \"Kaspi API connection timeout after 1800ms\"}",
          body_truncated: false
        },
        error: "HTTP 500 Internal Server Error"
      }
    ],
    breadcrumbs: [
      { t: start1 + 600, kind: "navigation", url: "https://portal.sdu.edu.kz/payments" },
      { t: start1 + 1500, kind: "click", target: "input#kaspi-method", text: "Оплата через Kaspi QR" },
      { t: start1 + 4100, kind: "click", target: "button#btn-pay.danger", text: "Оплатить общежитие" }
    ]
  },
  {
    id: "REP-10488",
    projectSlug: "sdu-portal",
    projectName: "SDU Student Portal",
    type: "feature",
    title: "Добавить темную тему в личный кабинет",
    description: "Было бы круто добавить темную тему оформления для подготовки к сессии ночью, глаза устают от белого фона.",
    status: "in_progress",
    createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    pageUrl: "https://portal.sdu.edu.kz/settings",
    reporter: {
      id: "u-2091",
      email: "dias@sdu.edu.kz"
    },
    environment: {
      url: "https://portal.sdu.edu.kz/settings",
      referrer: "https://portal.sdu.edu.kz/",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      browser: "Safari 17",
      os: "macOS",
      viewport: [1440, 900],
      screen_size: [1440, 900],
      device_pixel_ratio: 2,
      language: "en-US",
      timezone: "Asia/Almaty",
      client_time: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      online: true
    },
    hostMetadata: { app_version: "2.14.0" },
    console: [],
    network: [],
    breadcrumbs: []
  },
  {
    id: "REP-10475",
    projectSlug: "sdu-library",
    projectName: "SDU Library System",
    type: "question",
    title: "Как продлить срок сдачи учебника через личный кабинет?",
    description: "Не нахожу кнопку продления срока книги, система пишет, что срок истекает завтра.",
    status: "resolved",
    createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    pageUrl: "https://library.sdu.edu.kz/books",
    reporter: {
      id: "u-3301",
      email: "madina@sdu.edu.kz"
    },
    environment: {
      url: "https://library.sdu.edu.kz/books",
      referrer: "https://library.sdu.edu.kz/",
      user_agent: "Mozilla/5.0 Chrome/151.0",
      browser: "Chrome 151",
      os: "Windows",
      viewport: [1366, 768],
      screen_size: [1366, 768],
      device_pixel_ratio: 1,
      language: "ru-RU",
      timezone: "Asia/Almaty",
      client_time: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      online: true
    },
    hostMetadata: { app_version: "1.2.0" },
    console: [],
    network: [],
    breadcrumbs: []
  }
];
