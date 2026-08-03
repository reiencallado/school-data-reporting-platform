import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { UserProfile } from '../services/user.model';
import { UserRole } from './student.model';

interface DecodedToken {
  sub?: string;
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

  // Holds the current logged-in user's profile in memory
  currentUser = signal<UserProfile | null>(null);

  // Inject the HttpClient into the constructor
  constructor(private http: HttpClient) {}

  // --- NEW BACKEND CONNECTIONS ---

  // Connects to: POST http://localhost:8080/api/admin/users
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users`, userData);
  }

  // Connects to: GET http://localhost:8080/api/admin/users
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/users`);
  }

  // Connects to: PUT http://localhost:8080/api/admin/users/{id}
  updateUser(id: string, updates: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/users/${id}`, updates);
  }

  // Connects to: DELETE http://localhost:8080/api/admin/users/{id}
  // Server also rejects a user deleting their own account - the frontend
  // check (Users.isSelf) is UI-only, not a security boundary.
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/users/${id}`);
  }

  // Password resets go through updateUser(id, { password }) - there's no
  // separate reset endpoint, since PUT /admin/users/{id} already hashes
  // and saves a new password when one is included in the body.

  // Connects to: POST http://localhost:8080/api/auth/login
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials);
  }

  // Connects to: GET http://localhost:8080/api/users/me
  //
  // NOTE on the mapper below: UserProfile was a STOPGAP shape with just
  // { username, role, tenantId } (see user.model.ts). layout.ts's
  // loadFullProfile() also wants name/schoolName/logoUrl, so those are
  // mapped through here too - but the exact backend field names
  // (res.name / res.schoolName / res.logoUrl) are a best guess. Confirm
  // against the real /api/users/me response shape and adjust if needed.
  getProfile(): Observable<UserProfile> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.baseUrl}/users/me`, { headers }).pipe(
      map(res => ({
        username: res.username,
        role: res.role,
        tenantId: res.tenantMetadata?.tenantId ?? '',
        name: res.name,
        schoolName: res.schoolName ?? res.tenantMetadata?.tenantId,
        logoUrl: res.logoUrl ?? null,
      } as UserProfile)),
      tap(profile => this.currentUser.set(profile))
    );
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser();
  }

  // Connects to: POST http://localhost:8080/api/users/me/logo
  uploadLogo(file: File): Observable<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    // No Content-Type header - the browser sets the correct multipart
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
    this.currentUser.set(null);   // clear stale data
    console.log('User logged out');
  }

  // --- ROLE / SCHOOL CONTEXT (read directly from the JWT) ---
  //
  // The backend already embeds role, schoolId, and the user's email (as
  // the token subject) as claims - see JwtUtil.generateToken(). Rather
  // than a second network round-trip, this decodes those claims straight
  // out of the token already sitting in localStorage. This is purely for
  // UI display/filtering - it is NOT a security boundary; the real
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
   * Falls back to email if "name" isn't present in the token
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