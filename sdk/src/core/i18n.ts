/**
 * Модуль интернационализации (i18n) для виджета Lab Bug Reporter
 * Автоматически считывает язык страницы (document.documentElement.lang или navigator.language)
 * Поддерживает: Русский (ru), Казахский (kk), Английский (en).
 */

export type SupportedLang = 'ru' | 'en' | 'kk';

export interface Translations {
  launcherText: string;
  /** Label of the launcher while the form is open, when it turns into a close button. */
  launcherClose: string;
  headerTitle: string;
  headerSubtitle: string;
  typeLabel: string;
  typeBug: string;
  typeFeature: string;
  typeQuestion: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  optionalHint: string;
  descPlaceholder: string;
  btnScreenshot: string;
  screenshotHint: string;
  /** {count} becomes the number of screenshots taken. */
  screenshotCount: string;
  btnRecord: string;
  recordHint: string;
  btnRecordStop: string;
  attachmentsLabel: string;
  /** Says what the SDK attaches by itself and that nothing leaves the page before Submit. */
  contextNote: string;
  privacyNote: string;
  submitBtn: string;
  submittingText: string;
  retryBtn: string;
  errorUploadText: string;
  successTitle: string;
  successDesc: string;
  refLabel: string;
  btnNewReport: string;
  btnDone: string;
  btnClose: string;
  removeAttachment: string;
  screenshotItem: string;
  videoItem: string;
  /** Shown on the recording bar near the limit; {seconds} becomes the seconds left. */
  recordingTimeLeft: string;
}

const translations: Record<SupportedLang, Translations> = {
  ru: {
    launcherText: 'Помощь',
    launcherClose: 'Закрыть форму',
    headerTitle: 'Сообщить о проблеме',
    headerSubtitle: 'Сообщение получит команда лаборатории',
    typeLabel: 'Тип',
    typeBug: 'Баг',
    typeFeature: 'Предложение',
    typeQuestion: 'Вопрос',
    titleLabel: 'Что случилось',
    titlePlaceholder: 'Например: не загружается расписание',
    descLabel: 'Подробнее',
    optionalHint: 'необязательно',
    descPlaceholder: 'Что вы делали и что ожидали увидеть',
    btnScreenshot: 'Скриншот',
    screenshotHint: 'до 5',
    screenshotCount: '{count} из 5',
    btnRecord: 'Запись экрана',
    recordHint: 'с голосом, до 5 мин',
    btnRecordStop: 'Завершить',
    attachmentsLabel: 'Вложения',
    contextNote: '+ консоль, сетевые запросы и браузер приложим сами.',
    privacyNote: 'Ничего не уйдёт, пока вы не нажмёте «Отправить».',
    submitBtn: 'Отправить',
    submittingText: 'Отправляем…',
    retryBtn: 'Попробовать ещё раз',
    errorUploadText: 'Не удалось отправить. Черновик сохранён, попробуйте ещё раз.',
    successTitle: 'Отчёт отправлен',
    successDesc: 'Команда получила его и разберётся.',
    refLabel: 'номер',
    btnNewReport: 'Ещё один',
    btnDone: 'Готово',
    btnClose: 'Закрыть',
    removeAttachment: 'Убрать',
    screenshotItem: 'Скриншот',
    videoItem: 'Запись экрана',
    recordingTimeLeft: 'осталось {seconds} с'
  },
  kk: {
    launcherText: 'Көмек',
    launcherClose: 'Пішінді жабу',
    headerTitle: 'Мәселе туралы хабарлау',
    headerSubtitle: 'Хабарды зертхана командасы алады',
    typeLabel: 'Түрі',
    typeBug: 'Қате',
    typeFeature: 'Ұсыныс',
    typeQuestion: 'Сұрақ',
    titleLabel: 'Не болды',
    titlePlaceholder: 'Мысалы: сабақ кестесі жүктелмейді',
    descLabel: 'Толығырақ',
    optionalHint: 'міндетті емес',
    descPlaceholder: 'Не істедіңіз және не көруді күттіңіз',
    btnScreenshot: 'Скриншот',
    screenshotHint: '5-ке дейін',
    screenshotCount: '{count} / 5',
    btnRecord: 'Экранды жазу',
    recordHint: 'дауыспен, 5 минутқа дейін',
    btnRecordStop: 'Аяқтау',
    attachmentsLabel: 'Тіркемелер',
    contextNote: '+ консольді, желілік сұрауларды және браузерді өзіміз тіркейміз.',
    privacyNote: '«Жіберу» батырмасын баспайынша ештеңе жіберілмейді.',
    submitBtn: 'Жіберу',
    submittingText: 'Жіберілуде…',
    retryBtn: 'Қайта жіберу',
    errorUploadText: 'Жіберу мүмкін болмады. Жазғаныңыз сақталды, қайта көріңіз.',
    successTitle: 'Есеп жіберілді',
    successDesc: 'Команда оны алды және қарастырады.',
    refLabel: 'нөмірі',
    btnNewReport: 'Тағы біреу',
    btnDone: 'Дайын',
    btnClose: 'Жабу',
    removeAttachment: 'Алып тастау',
    screenshotItem: 'Скриншот',
    videoItem: 'Экран жазбасы',
    recordingTimeLeft: '{seconds} с қалды'
  },
  en: {
    launcherText: 'Get help',
    launcherClose: 'Close the form',
    headerTitle: 'Report an issue',
    headerSubtitle: 'It goes to the lab team',
    typeLabel: 'Type',
    typeBug: 'Bug',
    typeFeature: 'Idea',
    typeQuestion: 'Question',
    titleLabel: 'What happened',
    titlePlaceholder: 'For example: the timetable does not load',
    descLabel: 'Details',
    optionalHint: 'optional',
    descPlaceholder: 'What you did and what you expected to see',
    btnScreenshot: 'Screenshot',
    screenshotHint: 'up to 5',
    screenshotCount: '{count} of 5',
    btnRecord: 'Record screen',
    recordHint: 'with voice, up to 5 min',
    btnRecordStop: 'Stop',
    attachmentsLabel: 'Attachments',
    contextNote: '+ the console, network requests and browser are attached for you.',
    privacyNote: 'Nothing leaves the page until you press Send.',
    submitBtn: 'Send',
    submittingText: 'Sending…',
    retryBtn: 'Try again',
    errorUploadText: 'Could not send it. Your draft is kept, please try again.',
    successTitle: 'Report sent',
    successDesc: 'The team has it and will look into it.',
    refLabel: 'number',
    btnNewReport: 'Another one',
    btnDone: 'Done',
    btnClose: 'Close',
    removeAttachment: 'Remove',
    screenshotItem: 'Screenshot',
    videoItem: 'Screen recording',
    recordingTimeLeft: '{seconds}s left'
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
