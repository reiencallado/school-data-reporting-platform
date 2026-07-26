import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  isSubmitting = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onLogin() {
    if (this.isSubmitting() || !this.email || !this.password) {
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const credentials = {
      email: this.email,
      password: this.password
    };

    this.authService.login(credentials)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          localStorage.setItem('token', response.token);

          // Fetch full profile before navigating so layout has data immediately
          this.authService.getProfile().subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err) => {
              console.error('Failed to load profile:', err);
              this.router.navigate(['/dashboard']); // still proceed; layout will show fallback
            }
          });
        },
        error: (err) => {
          this.errorMessage.set(
            err?.status === 401 || err?.status === 400
              ? 'Invalid email or password. Please try again.'
              : 'Something went wrong. Please try again in a moment.'
          );
          console.error('API Error:', err);
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }
}