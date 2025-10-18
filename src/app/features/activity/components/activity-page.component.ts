import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, ApiActivity } from '@app/infrastructure/api.service';
import { AuthService } from '@app/infrastructure/auth.service';
import { ConfigService } from '@app/infrastructure/config.service';
import { NgpButton } from 'ng-primitives/button';

@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [CommonModule, NgpButton],
  templateUrl: './activity-page.component.html',
  styleUrls: ['./activity-page.component.scss'],
})
export class ActivityPageComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly cfg = inject(ConfigService);

  readonly usingApi = typeof window !== 'undefined' &&
    (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');

  readonly page = signal(1);
  readonly pageSize = 20;
  readonly total = signal(0);
  readonly items = signal<ApiActivity[]>([]);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  private readonly rawExpanded = signal<Record<string, boolean>>({});

  constructor() {
    this.loadPage(1);
  }

  async loadPage(p: number): Promise<void> {
    const page = Math.max(1, p);
    this.page.set(page);

    if (!this.usingApi) {
      this.items.set([]);
      this.total.set(0);
      return;
    }

    try {
      const resp = await this.api.listActivities(page, this.pageSize);
      this.items.set(resp.items);
      this.total.set(resp.total);
    } catch {
      this.items.set([]);
      this.total.set(0);
    }
  }

  friendlyAction(a: ApiActivity): string {
    return (a.action || '').replace(/-/g, ' ');
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

  toggleRaw(id: string | undefined): void {
    const key = String(id || '');
    if (!key) return;
    this.rawExpanded.update(m => ({ ...m, [key]: !m[key] }));
  }

  rawOpen(id: string | undefined): boolean {
    const key = String(id || '');
    return key ? !!this.rawExpanded()[key] : false;
  }
}