import type { CurrentUser } from '../api/types';

// The server enforces the same rules; these only hide controls the user cannot use.

export function canChangeStatus(user: CurrentUser): boolean {
  return user.roles.includes('admin') || user.roles.includes('triager');
}

export function canDeleteReports(user: CurrentUser): boolean {
  return user.roles.includes('admin');
}
