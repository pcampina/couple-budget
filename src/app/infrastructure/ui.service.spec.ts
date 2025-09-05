import { describe, it, expect, vi } from 'vitest';
import { UiService } from './ui.service';

describe('UiService', () => {
  it('increments/decrements loading state', () => {
    const ui = new UiService();
    expect(ui.isLoading()).toBe(false);
    ui.showLoading();
    expect(ui.isLoading()).toBe(true);
    ui.showLoading();
    expect(ui.isLoading()).toBe(true);
    ui.hideLoading();
    expect(ui.isLoading()).toBe(true);
    ui.hideLoading();
    expect(ui.isLoading()).toBe(false);
  });

  it('pushes and auto-dismisses toasts', () => {
    vi.useFakeTimers();
    const ui = new UiService();
    ui.toast('Hello', 'success', 1000);
    expect(ui.toasts().length).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(ui.toasts().length).toBe(0);
    vi.useRealTimers();
  });
});

