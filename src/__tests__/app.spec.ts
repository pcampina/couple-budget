import { TestBed } from '@angular/core/testing';
import { AppComponent } from '@app/app.component';
import { By } from '@angular/platform-browser';

describe('AppComponent UI', () => {
  it('renders a sample row and totals', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const headerCells = fixture.debugElement.queryAll(By.css('.thead .th'));
    expect(headerCells.length).toBeGreaterThan(0);

    const totalCell = fixture.debugElement.query(By.css('.tfoot .td.num.bold'));
    expect(totalCell.nativeElement.textContent).toContain('€');
  });
});
