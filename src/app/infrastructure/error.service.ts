import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { ConfigService } from './config.service';

export interface ErrorHandleOptions {
  userMessage?: string;
  showToast?: boolean;
  context?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  constructor(private notify: NotificationService, private cfg: ConfigService) {}

  toFriendlyMessage(err: unknown, fallback?: string): string {
    const e = err as any as HttpErrorResponse | undefined;
    const status = e?.status ?? -1;
    const serverMsg = (e as any)?.error?.error || (e as any)?.error?.message || (typeof (e as any)?.error === 'string' ? (e as any).error : '');
    if (serverMsg && this.cfg.debug) return String(serverMsg);
    if (status === 0) return 'Sem ligação. Verifique a sua Internet.';
    if (status === 400) return 'Pedido inválido.';
    if (status === 401) return 'Não autorizado.';
    if (status === 403) return 'Acesso negado.';
    if (status === 404) return 'Recurso não encontrado.';
    if (status === 429) return 'Demasiadas tentativas. Tente novamente mais tarde.';
    if (status >= 500) return 'Erro do servidor. Tente novamente.';
    return serverMsg || fallback || 'Ocorreu um erro.';
  }

  handle(err: unknown, opts?: ErrorHandleOptions): string {
    const msg = this.toFriendlyMessage(err, opts?.userMessage);
    if (opts?.showToast) this.notify.error(msg);
    if (this.cfg.debug) {
      // eslint-disable-next-line no-console
      console.error('[Error]', opts?.context || '', err);
    }
    return msg;
  }
}

