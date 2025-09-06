import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  /** Whether debug output should be shown (driven by window.__DEBUG__). */
  readonly debug: boolean;

  constructor() {
    try {
      const w = typeof window !== 'undefined' ? (window as any) : {};
      const raw = w.__DEBUG__;
      this.debug = raw === true || String(raw).toLowerCase() === 'true';
    } catch {
      this.debug = false;
    }
  }
}

