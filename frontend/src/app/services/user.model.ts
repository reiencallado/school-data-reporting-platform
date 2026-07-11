export type UserRole = 'ROLE_ADMIN' | 'ROLE_SCHOOL_ADMIN' | 'ROLE_VIEWER';

export interface School {
  id: string;
  name: string;
  logoUrl?: string | null;
}

// user.model.ts — STOPGAP shape, matches current /api/users/me response
// TODO: swap back to { name, email, role, school } once backend adds those fields
export interface UserProfile {
  username: string;
  role: string;
  tenantId: string;
}