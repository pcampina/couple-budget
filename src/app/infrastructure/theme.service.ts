import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('light');

  constructor() {
    try {
      const saved = typeof localStorage !== 'undefined' ? (localStorage.getItem('theme') as Theme | null) : null;
      const initial: Theme = saved === 'dark' || saved === 'light' ? saved : 'light';
      this.apply(initial);
    } catch {
      this.apply('light');
    }
  }

  toggle() {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.apply(next);
  }

  setTheme(t: Theme) { this.apply(t); }

  private apply(t: Theme) {
    this.theme.set(t);
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
      }
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', t);
    } catch {}
  }
}

