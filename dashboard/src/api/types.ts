/** Types of the server's dashboard API. Keep them in sync with the DTOs in server/. */

export interface ApiError {
  status: number;
  error: string;
  message: string;
}

export type UserRole = 'admin' | 'triager' | 'viewer';

export interface VisibleProject {
  slug: string;
  name: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string | null;
  roles: UserRole[];
  projects: VisibleProject[];
}
