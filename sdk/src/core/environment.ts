export interface EnvironmentInfo {
  url: string;
  referrer: string;
  user_agent: string;
  browser: string;
  os: string;
  viewport: [number, number];
  screen_size: [number, number];
  device_pixel_ratio: number;
  language: string;
  timezone: string;
  client_time: string;
  online: boolean;
}

export function captureEnvironment(): EnvironmentInfo {
  const ua = navigator.userAgent;

  // Простое и надежное определение браузера и ОС
  let browser = 'Unknown';
  if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+)/);
    browser = `Chrome ${match ? match[1] : ''}`.trim();
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)/);
    browser = `Firefox ${match ? match[1] : ''}`.trim();
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
  }

  let os = 'Unknown';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    url: window.location.href,
    referrer: document.referrer || '',
    user_agent: ua,
    browser,
    os,
    viewport: [window.innerWidth, window.innerHeight],
    screen_size: [window.screen.width, window.screen.height],
    device_pixel_ratio: window.devicePixelRatio || 1,
    language: navigator.language || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    client_time: new Date().toISOString(),
    online: navigator.onLine
  };
}
