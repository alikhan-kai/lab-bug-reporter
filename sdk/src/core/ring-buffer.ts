/**
 * Ограниченный по памяти и времени кольцевой буфер (Bounded Ring Buffer)
 * Защищает браузер от утечек памяти (Memory Leak Prevention).
 */
export interface Timestamped {
  timestamp: number;
}

export class RingBuffer<T extends Timestamped> {
  private items: T[] = [];

  constructor(
    private readonly maxSize: number,
    private readonly maxAgeMs: number = 5 * 60 * 1000 // 5 минут по умолчанию
  ) {}

  add(item: T): void {
    this.evictExpired();
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift();
    }
  }

  getAll(): T[] {
    this.evictExpired();
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }

  private evictExpired(): void {
    const now = Date.now();
    const threshold = now - this.maxAgeMs;
    // Очищаем записи старше maxAgeMs
    while (this.items.length > 0 && this.items[0].timestamp < threshold) {
      this.items.shift();
    }
  }
}
