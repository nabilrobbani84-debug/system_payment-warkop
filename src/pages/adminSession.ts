const SESSION_KEY = 'warkop_admin_auth';
const SESSION_USER_KEY = 'warkop_admin_username';

export function setAdminSession(username: string) {
  sessionStorage.setItem(SESSION_KEY, 'true');
  sessionStorage.setItem(SESSION_USER_KEY, username);
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
}

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function getAdminUsername(): string {
  return sessionStorage.getItem(SESSION_USER_KEY) || 'Admin';
}
