/**
 * Модуль интернационализации (i18n) для виджета Lab Bug Reporter
 * Автоматически считывает язык страницы (document.documentElement.lang или navigator.language)
 * Поддерживает: Русский (ru), Казахский (kk), Английский (en).
 */

export type SupportedLang = 'ru' | 'en' | 'kk';

export interface Translations {
  launcherText: string;
  headerTitle: string;
  typeBug: string;
  typeFeature: string;
  typeQuestion: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  attachmentsLabel: string;
  btnScreenshot: string;
  btnScreenshotLimit: string;
  btnRecord: string;
  btnRecordStop: string;
  submitBtn: string;
  submittingText: string;
  retryBtn: string;
  errorUploadText: string;
  successTitle: string;
  successDesc: string;
  btnNewReport: string;
  btnClose: string;
  recordingTitle: string;
  removeAttachment: string;
  screenshotItem: string;
  videoItem: string;
}

const translations: Record<SupportedLang, Translations> = {
  ru: {
    launcherText: 'Помощь',
    headerTitle: 'Сообщить о проблеме',
    typeBug: 'Баг',
    typeFeature: 'Предложение',
    typeQuestion: 'Вопрос',
    titleLabel: 'Тема проблемы *',
    titlePlaceholder: 'Кратко опишите проблему...',
    descLabel: 'Описание',
    descPlaceholder: 'Что произошло или как повторить сбой...',
    attachmentsLabel: 'Вложения (до 5 скриншотов)',
    btnScreenshot: 'Скриншот',
    btnScreenshotLimit: 'Лимит скриншотов (5)',
    btnRecord: 'Запись экрана',
    btnRecordStop: 'Завершить запись',
    submitBtn: 'Отправить отчет',
    submittingText: 'Отправка отчета...',
    retryBtn: 'Повторить попытку',
    errorUploadText: 'Не удалось отправить отчет. Проверьте соединение с сервером.',
    successTitle: 'Отчет отправлен!',
    successDesc: 'Команда лаборатории получила информацию и уже разбирается.',
    btnNewReport: '+ Новый отчет',
    btnClose: 'Закрыть',
    recordingTitle: 'Идет запись экрана',
    removeAttachment: 'Удалить',
    screenshotItem: 'Скриншот',
    videoItem: 'Видеозапись'
  },
  kk: {
    launcherText: 'Көмек',
    headerTitle: 'Мәселе туралы хабарлау',
    typeBug: 'Қате (Баг)',
    typeFeature: 'Ұсыныс',
    typeQuestion: 'Сұрақ',
    titleLabel: 'Мәселе тақырыбы *',
    titlePlaceholder: 'Мәселені қысқаша сипаттаңыз...',
    descLabel: 'Толық сипаттамасы',
    descPlaceholder: 'Не болғанын немесе қалай қайталауға болатынын жазыңыз...',
    attachmentsLabel: 'Тіркемелер (5 скриншотқа дейін)',
    btnScreenshot: 'Скриншот',
    btnScreenshotLimit: 'Скриншот шегі (5)',
    btnRecord: 'Экранды жазу',
    btnRecordStop: 'Жазуды аяқтау',
    submitBtn: 'Есепті жіберу',
    submittingText: 'Есеп жіберілуде...',
    retryBtn: 'Қайта көру',
    errorUploadText: 'Есепті жіберу мүмкін болмады. Сервермен байланысты тексеріңіз.',
    successTitle: 'Есеп жіберілді!',
    successDesc: 'Зертхана командасы ақпаратты алды және қарастыруда.',
    btnNewReport: '+ Жаңа есеп',
    btnClose: 'Жабу',
    recordingTitle: 'Экран жазылуда',
    removeAttachment: 'Жою',
    screenshotItem: 'Скриншот',
    videoItem: 'Бейнежазба'
  },
  en: {
    launcherText: 'Get help',
    headerTitle: 'Report an issue',
    typeBug: 'Bug',
    typeFeature: 'Feature',
    typeQuestion: 'Question',
    titleLabel: 'Issue title *',
    titlePlaceholder: 'Briefly describe the issue...',
    descLabel: 'Description',
    descPlaceholder: 'What happened or steps to reproduce...',
    attachmentsLabel: 'Attachments (up to 5 screenshots)',
    btnScreenshot: 'Screenshot',
    btnScreenshotLimit: 'Screenshot limit (5)',
    btnRecord: 'Screen record',
    btnRecordStop: 'Stop recording',
    submitBtn: 'Submit report',
    submittingText: 'Submitting report...',
    retryBtn: 'Retry',
    errorUploadText: 'Failed to submit report. Please check server connection.',
    successTitle: 'Report submitted!',
    successDesc: 'The lab team has received the report and is reviewing it.',
    btnNewReport: '+ New report',
    btnClose: 'Close',
    recordingTitle: 'Recording screen',
    removeAttachment: 'Remove',
    screenshotItem: 'Screenshot',
    videoItem: 'Screen recording'
  }
};

/**
 * Определяет язык страницы или окружения
 */
export function detectLanguage(preferredLang?: string): SupportedLang {
  if (preferredLang && (preferredLang === 'ru' || preferredLang === 'en' || preferredLang === 'kk')) {
    return preferredLang;
  }

  // 1. Проверяем атрибут lang у тега <html>
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    const docLang = document.documentElement.lang.toLowerCase();
    if (docLang.startsWith('kk') || docLang.startsWith('kz')) return 'kk';
    if (docLang.startsWith('ru')) return 'ru';
    if (docLang.startsWith('en')) return 'en';
  }

  // 2. Проверяем системный язык браузера
  if (typeof navigator !== 'undefined' && navigator.language) {
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('kk') || navLang.startsWith('kz')) return 'kk';
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('en')) return 'en';
  }

  return 'ru';
}

export function getTranslations(lang: SupportedLang): Translations {
  return translations[lang] || translations.ru;
}
