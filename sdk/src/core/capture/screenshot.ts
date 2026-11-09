/**
 * Модуль захвата скриншота (Pixel-perfect Screen Capture)
 * Захватывает точный попиксельный кадр страницы без искажений CSS.
 */

export async function captureScreenFrame(): Promise<Blob> {
  // Запрашиваем 1 кадр экрана
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser'
    },
    audio: false
  });

  const track = stream.getVideoTracks()[0];
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;

  return new Promise<Blob>((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context недоступен');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Сразу освобождаем поток захвата экрана
        track.stop();
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Не удалось преобразовать холст в Blob'));
          }
        }, 'image/png');
      } catch (err) {
        track.stop();
        reject(err);
      }
    };

    video.onerror = (e) => {
      track.stop();
      reject(e);
    };
  });
}
