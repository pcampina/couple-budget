import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/infrastructure/auth.service';
import { BudgetStore } from '@app/application/budget.store';
import { UiService } from '@app/infrastructure/ui.service';
import { ThemeService } from '@app/infrastructure/theme.service';
import { Participant } from '@app/domain/models';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  readonly auth: AuthService = inject(AuthService);
  readonly router: Router = inject(Router);
  readonly ui: UiService = inject(UiService);
  readonly theme: ThemeService = inject(ThemeService);
  readonly store: BudgetStore = inject(BudgetStore);
  readonly collapsed = signal(false);
  readonly usingApi = typeof window !== 'undefined' && (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');
  readonly isAdmin = computed(() => this.auth.role() === 'admin');
  readonly displayName = computed(() => {
    try {
      const email = String(this.auth.user()?.email || '').toLowerCase();
      const p = this.store.participants().find((x: Participant) => x.email && String(x.email).toLowerCase() === email);
      const name = p?.name || (email.split('@')[0] || '');
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Settings';
    } catch { return 'Settings'; }
  });

  toggleCollapse() { this.collapsed.set(!this.collapsed()); }

  constructor() {
    try {
      const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      this.collapsed.set(!!isMobile);
    } catch {}
  }

  async logout() {
    try { await this.auth.signOut(); } catch {}
    try { await this.router.navigateByUrl('/login'); } catch {}
  }

  async gotoSettings() {
    try { await this.router.navigateByUrl('/config'); } catch {}
  }
}
