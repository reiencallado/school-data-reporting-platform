import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// Import AuthService
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

  // AuthService inside the constructor 
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onLogin() {
    // Wrap credentials 
    const credentials = {
      email: this.email,
      password: this.password
    };

    // API call to Spring Boot backend
    this.authService.login(credentials).subscribe({
      next: (response) => {
        // Save the JWT token to the browser's storage
        localStorage.setItem('token', response.token);
        
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Show error pop-up if credentials don't match database
        alert('Unauthorized: Invalid email or password credentials supplied.');
        console.error('API Error:', err);
      }
    });
  }
}