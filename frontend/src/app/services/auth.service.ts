import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRole } from './student.model';

interface DecodedToken {
  sub?: string;       // email, per AuthController's token subject
  role?: UserRole;
  schoolId?: string;
  tenantId?: string;
  name?: string;
  [key: string]: unknown;
}

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

  // Connects to: POST http://localhost:8080/api/users/me/logo
  uploadLogo(file: File): Observable<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    // No Content-Type header — the browser sets the correct multipart
    // boundary automatically when using FormData.

    return this.http.post<{ logoUrl: string }>(
      `${this.baseUrl}/users/me/logo`,
      formData,
      { headers }
    );
  }

  logout() {
    // Clean up the token from the browser when user logs out
    localStorage.removeItem('token');
    console.log('User logged out');
  }

  // --- ROLE / SCHOOL CONTEXT (read directly from the JWT) ---
  //
  // The backend already embeds role, schoolId, and the user's email (as
  // the token subject) as claims — see JwtUtil.generateToken(). Rather
  // than a second network round-trip, this decodes those claims straight
  // out of the token already sitting in localStorage. This is purely for
  // UI display/filtering — it is NOT a security boundary; the real
  // enforcement happens server-side (AuthUtil + @PreAuthorize on each
  // controller). A user could edit this token's payload in devtools and
  // see a different role reflected in the UI, but every actual API call
  // is independently re-verified against the real signed token by the
  // backend regardless of what the frontend displays.

  private decodeToken(token: string): DecodedToken | null {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(normalized)
          .split('')
          .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to decode JWT:', e);
      return null;
    }
  }

  private getDecodedToken(): DecodedToken | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return this.decodeToken(token);
  }

  getCurrentRole(): UserRole | null {
    return this.getDecodedToken()?.role ?? null;
  }

  getCurrentSchoolId(): string | null {
    return this.getDecodedToken()?.schoolId ?? null;
  }

  getCurrentEmail(): string | null {
    return this.getDecodedToken()?.sub ?? null;
  }

  /**
   * Falls back to email if "name" isn't present in the token — this
   * happens for any token issued before this claim was added, so
   * existing logged-in sessions don't show a blank name until they
   * re-login.
   */
  getCurrentName(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.name ?? decoded?.sub ?? null;
  }

  isAdmin(): boolean {
    return this.getCurrentRole() === 'ROLE_ADMIN';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}