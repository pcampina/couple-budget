import { Injectable, computed, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: string; type: ToastType; message: string }

@Injectable({ providedIn: 'root' })
export class UiService {
  private _loading = signal(0);
  readonly isLoading = computed(() => this._loading() > 0);

  private _toasts = signal<Toast[]>([]);
  readonly toasts = computed(() => this._toasts());

  showLoading() { this._loading.update(n => n + 1); }
  hideLoading() { this._loading.update(n => Math.max(0, n - 1)); }

  toast(message: string, type: ToastType = 'info', durationMs = 2500) {
    const id = (crypto as any).randomUUID?.() || String(Math.random());
    const t: Toast = { id, type, message };
    this._toasts.update(list => [...list, t]);
    setTimeout(() => {
      this._toasts.update(list => list.filter(x => x.id !== id));
    }, durationMs);
  }
}

