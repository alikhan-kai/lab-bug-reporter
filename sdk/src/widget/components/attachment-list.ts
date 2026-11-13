import { icons } from '../icons';
import { widgetStyles } from '../tokens.css';

export interface AttachmentItem {
  id: string;
  kind: 'screenshot' | 'video';
  name: string;
  sizeBytes?: number;
  durationSeconds?: number;
  blob?: Blob;
  previewUrl?: string;
}

export type AttachmentListState = 'empty' | 'with_items';

export interface AttachmentListOptions {
  items?: AttachmentItem[];
  emptyText?: string;
  onRemove?: (item: AttachmentItem, index: number) => void;
  onReRecord?: () => void;
  container?: HTMLElement;
  isolated?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Attachment list: Screenshots and video preview with remove/re-record per spec Section 9.
 * States: empty, with items.
 */
export class AttachmentList {
  public element: HTMLDivElement;
  private items: AttachmentItem[] = [];
  private emptyText: string;
  private onRemoveCallback?: (item: AttachmentItem, index: number) => void;
  private onReRecordCallback?: () => void;

  constructor(options: AttachmentListOptions = {}) {
    this.emptyText = options.emptyText || 'Нет прикрепленных файлов';
    this.onRemoveCallback = options.onRemove;
    this.onReRecordCallback = options.onReRecord;

    this.element = document.createElement('div');
    this.element.className = 'lab-attachments-list';

    if (options.items && options.items.length > 0) {
      this.setItems(options.items);
    } else {
      this.renderEmpty();
    }

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  setItems(items: AttachmentItem[]): void {
    this.items = [...items];
    this.render();
  }

  addItem(item: AttachmentItem): void {
    this.items.push(item);
    this.render();
  }

  removeItem(index: number): void {
    const [removed] = this.items.splice(index, 1);
    this.render();
    if (removed && this.onRemoveCallback) {
      this.onRemoveCallback(removed, index);
    }
  }

  clear(): void {
    this.items = [];
    this.renderEmpty();
  }

  getItems(): AttachmentItem[] {
    return this.items;
  }

  getState(): AttachmentListState {
    return this.items.length > 0 ? 'with_items' : 'empty';
  }

  setState(state: AttachmentListState, demoItems?: AttachmentItem[]): void {
    if (state === 'empty') {
      this.clear();
    } else {
      const items = demoItems || [
        {
          id: 'demo-shot-1',
          kind: 'screenshot',
          name: 'Скриншот экрана',
          sizeBytes: 290816 // 284 KB
        },
        {
          id: 'demo-vid-1',
          kind: 'video',
          name: 'Запись экрана с микрофоном',
          sizeBytes: 1572864, // 1.5 MB
          durationSeconds: 12
        }
      ];
      this.setItems(items);
    }
  }

  private renderEmpty(): void {
    this.element.innerHTML = `<div style="color: var(--lab-text-muted, #6b7280); font-size: 13px; font-style: italic; padding: 6px 0;">${this.emptyText}</div>`;
  }

  private render(): void {
    if (this.items.length === 0) {
      this.renderEmpty();
      return;
    }

    this.element.innerHTML = '';
    this.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'lab-attachment-item';

      const left = document.createElement('div');
      left.className = 'lab-attachment-name';
      const iconSvg = item.kind === 'video' ? icons.video(14) : icons.image(14);

      let details = '';
      if (item.sizeBytes) {
        details += ` (${Math.round(item.sizeBytes / 1024)} КБ`;
        if (item.durationSeconds) {
          details += `, ${item.durationSeconds} сек`;
        }
        details += ')';
      }

      left.innerHTML = `${iconSvg} <span>${item.name}${details}</span>`;
      row.appendChild(left);

      const right = document.createElement('div');
      right.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      if (item.kind === 'video' && this.onReRecordCallback) {
        const reRecordBtn = document.createElement('button');
        reRecordBtn.type = 'button';
        reRecordBtn.className = 'lab-btn-outline';
        reRecordBtn.style.cssText = 'padding: 2px 6px; font-size: 11px;';
        reRecordBtn.textContent = 'Перезаписать';
        reRecordBtn.addEventListener('click', () => this.onReRecordCallback?.());
        right.appendChild(reRecordBtn);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'lab-btn-remove';
      removeBtn.title = 'Удалить';
      removeBtn.innerHTML = `${icons.close(14)}`;
      removeBtn.addEventListener('click', () => this.removeItem(index));
      right.appendChild(removeBtn);

      row.appendChild(right);
      this.element.appendChild(row);
    });
  }

  mount(target: HTMLElement, isolated: boolean = false, theme: 'light' | 'dark' | 'system' = 'light'): void {
    if (isolated) {
      const host = document.createElement('div');
      host.className = 'lab-component-host';
      host.setAttribute('data-theme', theme);
      const shadow = host.attachShadow({ mode: 'open' });
      const styleEl = document.createElement('style');
      styleEl.textContent = widgetStyles;
      shadow.appendChild(styleEl);
      shadow.appendChild(this.element);
      target.appendChild(host);
    } else {
      target.appendChild(this.element);
    }
  }
}
