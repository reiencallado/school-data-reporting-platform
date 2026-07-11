import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { UserProfile } from '../services/user.model';

@Injectable({
  providedIn: 'root' 
})
export class AuthService { 
  // Define local Spring Boot URL home base
  private baseUrl = 'http://localhost:8080/api';

  // Holds the current logged-in user's profile in memory
  currentUser = signal<UserProfile | null>(null);

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
  getProfile(): Observable<UserProfile> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.baseUrl}/users/me`, { headers }).pipe(
      map(res => ({
        username: res.username,
        role: res.role,
        tenantId: res.tenantMetadata?.tenantId ?? ''
      } as UserProfile)),
      tap(profile => this.currentUser.set(profile))
    );
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser();
  }

  logout() {
    // Clean up the token from the browser when user logs out
    localStorage.removeItem('token');
    this.currentUser.set(null);   // clear stale data
    console.log('User logged out');
  }
}