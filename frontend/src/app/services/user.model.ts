export interface School {
  id: string;
  name: string;
  logoUrl?: string | null;
}

// TODO: swap back to { name, email, role, school } once added in backend (as a nested `school` object rather than flat strings).
//
// name / schoolName / logoUrl are added here as optional because layout.ts
// reads them off the profile returned by AuthService.getProfile(). Field
// (res.name / res.schoolName / res.logoUrl) should be adjusted to match the real /api/users/me response once confirmed.
export interface UserProfile {
  username: string;
  role: string;
  tenantId: string;
  name?: string;
  schoolName?: string;
  logoUrl?: string | null;
}