import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' 
})
export class AuthService { 
  // Define local Spring Boot URL home base
  private baseUrl = 'http://localhost:8080/api';

  // Inject the HttpClient into the constructor
  constructor(private http: HttpClient) {}

  // --- NEW BACKEND CONNECTIONS ---

  // Connects to: POST http://localhost:8080/api/admin/users
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users`, userData);
  }

  // Connects to: POST http://localhost:8080/api/auth/login
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials);
  }

  // Connects to: GET http://localhost:8080/api/users/me
  getProfile(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.baseUrl}/users/me`, { headers });
  }

  logout() {
    // Clean up the token from the browser when user logs out
    localStorage.removeItem('token');
    console.log('User logged out');
  }
}