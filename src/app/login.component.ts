import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './infrastructure/auth.service';

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

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    this.error = null;
    try {
      await this.auth.signInWithPassword(this.email, this.password);
      await this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e?.message || 'Login failed';
    }
  }
}

