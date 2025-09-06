import { Injectable } from '@angular/core';
import { UiService, ToastType } from './ui.service';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private ui: UiService, private cfg: ConfigService) {}

  info(message: string, durationMs?: number) { this.ui.toast(message, 'info', durationMs); }
  success(message: string, durationMs?: number) { this.ui.toast(message, 'success', durationMs); }
  error(message: string, durationMs?: number) { this.ui.toast(message, 'error', durationMs); }

  /** Generic method keeping legacy signature */
  toast(message: string, type: ToastType = 'info', durationMs?: number) { this.ui.toast(message, type, durationMs); }

  /** Log additional details only in debug mode. */
  debugLog(context: string, details: unknown) {
    if (!this.cfg.debug) return;
    // eslint-disable-next-line no-console
    console.debug('[DEBUG]', context, details);
  }
}

