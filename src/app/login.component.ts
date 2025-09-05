import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './infrastructure/auth.service';
import { UiService } from './infrastructure/ui.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  error: string | null = null;

  constructor(private auth: AuthService, private router: Router, private ui: UiService) {}

  async login() {
    this.error = null;
    this.ui.showLoading();
    try {
      await this.auth.signInWithPassword(this.email, this.password);
      this.ui.toast('Welcome!', 'success');
      await this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e?.message || 'Login failed';
      this.ui.toast(this.error || 'Login failed', 'error');
    } finally {
      this.ui.hideLoading();
    }
  }
}
