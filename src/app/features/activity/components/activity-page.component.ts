import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe, CurrencyPipe } from '@angular/common';
import { ApiService, ApiActivity } from '@app/infrastructure/api.service';
import { AuthService } from '@app/infrastructure/auth.service';
import { ConfigService } from '@app/infrastructure/config.service';

@Component({
  selector: 'app-activity-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, JsonPipe, CurrencyPipe],
  templateUrl: './activity-page.component.html'
})
export class ActivityPageComponent {
  private api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly cfg = inject(ConfigService);
  readonly usingApi = typeof window !== 'undefined' && (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');

  page = signal(1);
  pageSize = 20;
  total = signal(0);
  items = signal<ApiActivity[]>([]);
  private rawExpanded = signal<Record<string, boolean>>({});

  constructor() { this.loadPage(1); }

  async loadPage(p: number) {
    const page = Math.max(1, p);
    this.page.set(page);
    if (!this.usingApi) { this.items.set([]); this.total.set(0); return; }
    try {
      const resp = await this.api.listActivities(page, this.pageSize);
      this.items.set(resp.items);
      this.total.set(resp.total);
    } catch { this.items.set([]); this.total.set(0); }
  }

  friendlyAction(a: ApiActivity): string {
    try { return String(a.action || '').replace(/-/g, ' '); } catch { return String(a.action || ''); }
  }

  actorName(activity: ApiActivity): string {
    if (!activity) return '—';
    const name = String(activity.user_name || '').trim();
    if (name) return name;
    const uid = activity.user_id;
    const selfId = this.auth.user()?.sub;
    if (uid && selfId && uid === selfId) return 'You';
    return '—';
  }

  shortId(id: string | undefined | null, len = 8): string {
    const s = String(id || '');
    if (!s) return '';
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  kvEntries(o: unknown): [string, any][] {
    const obj = (o && typeof o === 'object') ? (o as any) : {};
    return Object.entries(obj);
  }

  toggleRaw(id: string | undefined): void {
    const key = String(id || '');
    this.rawExpanded.update(m => ({ ...m, [key]: !m[key] }));
  }

  rawOpen(id: string | undefined): boolean {
    const key = String(id || '');
    return !!this.rawExpanded()[key];
  }

  detailSummary(payload: unknown): string {
    try {
      const p: any = (payload && typeof payload === 'object') ? payload as any : {};
      if (p.total != null) return `total: ${p.total}`;
      if (p.name != null) return `name: ${String(p.name)}`;
      return '—';
    } catch { return '—'; }
  }
}
