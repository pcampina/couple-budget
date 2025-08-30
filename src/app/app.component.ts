import { Component, inject } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from './application/budget.store';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly store = inject(BudgetStore);

  newName = '';
  newTotal: number | null = null;

  isValid(v: any) { return typeof v === 'number' && isFinite(v) && v >= 0; }

  toNumber(value: any): number {
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  }

  addFromForm() {
    if (!this.newName || !this.isValid(this.newTotal)) return;
    this.store.addExpense(this.newName, this.newTotal!);
    this.newName = '';
    this.newTotal = null;
  }

  gridTemplateColumns(): string {
    const participantCols = Array(this.store.participants().length).fill('1.2fr').join(' ');
    return `2fr 1.2fr ${participantCols} 88px`;
  }
}
