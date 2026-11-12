/**
 * Модуль видеозаписи экрана со звуком микрофона (Screen & Audio Recorder)
 * Обеспечивает точную фиксацию времени старта (recordingStartTime) для Jam.dev синхронизации.
 * Корректно и полностью освобождает микрофон и видеопоток после остановки.
 */

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  startTime: number;
  mimeType: string;
}

/** The longest recording the service accepts (MAX_VIDEO_SECONDS on the server). */
export const MAX_RECORDING_SECONDS = 300;

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording: boolean = false;
  private maxDurationTimer: any = null;
  // One stop per recording: a stop by the limit or by the browser's "Stop sharing" hands the same result to a later stop().
  private stopPromise: Promise<RecordingResult> | null = null;
  private autoStopListener?: (result: RecordingResult) => void;

  /** Called when the recording stops without stop(): at the time limit or from the browser's sharing bar. */
  onAutoStop(listener: (result: RecordingResult) => void): void {
    this.autoStopListener = listener;
  }

  /**
   * Начать запись экрана с опциональным микрофоном
   * @param optionsOrMic - объект { microphone?: boolean } или булево значение
   */
  async start(optionsOrMic?: { microphone?: boolean } | boolean, maxDurationSeconds: number = MAX_RECORDING_SECONDS): Promise<number> {
    if (this.isRecording) {
      throw new Error('Запись уже идет');
    }

    const withMicrophone = typeof optionsOrMic === 'object' 
      ? optionsOrMic?.microphone !== false 
      : (optionsOrMic !== false);

    // 1. Захват экрана
    this.displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser'
      },
      audio: true // системный звук / звук вкладки
    });

    this.combinedStream = this.displayStream;

    // 2. Если нужен микрофон — подключаем голос и микшируем
    if (withMicrophone) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        // Создаем Web Audio Context для микширования звука
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const destination = this.audioContext.createMediaStreamDestination();

        // Подключаем звук экрана, если есть
        if (this.displayStream.getAudioTracks().length > 0) {
          const screenSource = this.audioContext.createMediaStreamSource(this.displayStream);
          screenSource.connect(destination);
        }

        // Подключаем звук микрофона
        const micSource = this.audioContext.createMediaStreamSource(this.micStream);
        micSource.connect(destination);

        // Объединяем видео экрана и смикшированный звук
        this.combinedStream = new MediaStream([
          ...this.displayStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ]);
      } catch (err) {
        console.warn('[LabReporter] Микрофон отклонен или недоступен. Запись пойдет без звука микрофона.');
      }
    }

    this.recordedChunks = [];
    this.stopPromise = null;
    this.startTime = Date.now(); // ЯКОРЬ ВРЕМЕНИ ДЛЯ JAM.DEV

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    this.mediaRecorder = new MediaRecorder(this.combinedStream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Если пользователь сам нажал "Закрыть доступ" в панели браузера
    this.displayStream.getVideoTracks()[0].addEventListener('ended', () => this.stopByItself());

    this.mediaRecorder.start(1000);
    this.isRecording = true;

    // Лимит 5 минут
    this.maxDurationTimer = setTimeout(() => this.stopByItself(), maxDurationSeconds * 1000);

    return this.startTime;
  }

  /**
   * Остановить запись и ПОЛНОСТЬЮ освободить микрофон и экран
   */
  stop(): Promise<RecordingResult> {
    if (this.stopPromise) {
      return this.stopPromise;
    }
    if (!this.mediaRecorder || !this.isRecording) {
      return Promise.reject(new Error('Запись не была запущена'));
    }
    this.stopPromise = this.stopMediaRecorder(this.mediaRecorder);
    return this.stopPromise;
  }

  private stopByItself(): void {
    if (!this.isRecording || this.stopPromise) return;
    this.stop()
      .then((result) => this.autoStopListener?.(result))
      .catch(() => {
        // The recorder failed to stop; there is no video to hand over.
      });
  }

  private stopMediaRecorder(mediaRecorder: MediaRecorder): Promise<RecordingResult> {
    return new Promise((resolve) => {
      if (this.maxDurationTimer) {
        clearTimeout(this.maxDurationTimer);
        this.maxDurationTimer = null;
      }

      mediaRecorder.onstop = async () => {
        const durationMs = Date.now() - this.startTime;
        const mimeType = mediaRecorder.mimeType || 'video/webm';
        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });

        // 1. Полностью глушим и останавливаем дорожки микрофона
        if (this.micStream) {
          this.micStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          this.micStream = null;
        }

        // 2. Полностью глушим и останавливаем экран
        if (this.displayStream) {
          this.displayStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          this.displayStream = null;
        }

        // 3. Останавливаем объединенный поток
        if (this.combinedStream) {
          this.combinedStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          this.combinedStream = null;
        }

        // 4. Закрываем AudioContext
        if (this.audioContext && this.audioContext.state !== 'closed') {
          try {
            await this.audioContext.close();
          } catch {}
          this.audioContext = null;
        }

        this.isRecording = false;
        this.mediaRecorder = null;

        resolve({
          blob: finalBlob,
          durationMs,
          startTime: this.startTime,
          mimeType
        });
      };

      mediaRecorder.stop();
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getStartTime(): number {
    return this.startTime;
  }
}
