import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../infrastructure/auth.service';
import { UiService } from '../../infrastructure/ui.service';
import { ThemeService } from '../../infrastructure/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly ui = inject(UiService);
  readonly theme = inject(ThemeService);
  readonly collapsed = signal(false);
  readonly usingApi = typeof window !== 'undefined' && (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');
  readonly isAdmin = computed(() => this.auth.role() === 'admin');

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
}
