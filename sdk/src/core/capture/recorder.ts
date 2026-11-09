/**
 * Модуль видеозаписи экрана со звуком микрофона (Screen & Audio Recorder)
 * Обеспечивает точную фиксацию времени старта (recordingStartTime) для Jam.dev синхронизации.
 */

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  startTime: number;
  mimeType: string;
}

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private maxDurationTimer: any = null;

  /**
   * Начать запись экрана с опциональным микрофоном
   * @param withMicrophone - включать ли микрофон
   * @param maxDurationSeconds - авто-остановка (по умолчанию 300 сек / 5 мин)
   */
  async start(withMicrophone: boolean = true, maxDurationSeconds: number = 300): Promise<number> {
    if (this.isRecording) {
      throw new Error('Запись уже идет');
    }

    // 1. Захват экрана (вкладки или окна)
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser'
      },
      audio: true // захват звука вкладки, если пользователь разрешит
    });

    let combinedStream = displayStream;

    // 2. Если нужен микрофон — подключаем голос и микшируем
    if (withMicrophone) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        // Микшируем звук вкладки и звук микрофона через Web Audio API
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const destination = audioCtx.createMediaStreamDestination();

        // Добавляем аудиодорожки вкладки
        displayStream.getAudioTracks().forEach(track => {
          const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
          source.connect(destination);
        });

        // Добавляем аудиодорожки микрофона
        micStream.getAudioTracks().forEach(track => {
          const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
          source.connect(destination);
        });

        // Создаем итоговый поток: видео экрана + объединенный звук
        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ]);
      } catch (err) {
        console.warn('[LabReporter] Доступ к микрофону отклонен или недоступен. Запись пойдет без звука микрофона.');
      }
    }

    this.stream = combinedStream;
    this.recordedChunks = [];
    this.startTime = Date.now(); // ГЛАВНЫЙ ЯКОРЬ ВРЕМЕНИ ДЛЯ JAM.DEV

    // Подбираем поддерживаемый кодек WebM
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Если пользователь сам остановил демонстрацию экрана в панели браузера
    displayStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (this.isRecording) {
        this.stop();
      }
    });

    this.mediaRecorder.start(1000); // нарезка чанков каждую секунду
    this.isRecording = true;

    // Авто-остановка по превышению лимита (5 минут по ТЗ)
    this.maxDurationTimer = setTimeout(() => {
      if (this.isRecording) {
        console.warn('[LabReporter] Достигнут лимит длительности записи (5 минут). Остановка.');
        this.stop();
      }
    }, maxDurationSeconds * 1000);

    return this.startTime;
  }

  /**
   * Остановить запись и вернуть итоговый WebM Blob
   */
  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        return reject(new Error('Запись не была запущена'));
      }

      if (this.maxDurationTimer) {
        clearTimeout(this.maxDurationTimer);
        this.maxDurationTimer = null;
      }

      this.mediaRecorder.onstop = () => {
        const durationMs = Date.now() - this.startTime;
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });

        // Останавливаем все треки оборудования (освобождаем камеру/микрофон)
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
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

      this.mediaRecorder.stop();
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getStartTime(): number {
    return this.startTime;
  }
}
