const TOKEN_KEY = 'gs_token';
const ROLE_KEY = 'gs_role';
const USER_KEY = 'gs_user';

export function readStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const role = localStorage.getItem(ROLE_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !role || !userRaw) return { token: null, role: null, user: null };
  try {
    return { token, role, user: JSON.parse(userRaw) };
  } catch {
    return { token: null, role: null, user: null };
  }
}

export function writeStoredAuth(role, token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}

export function loginPathForRole(role) {
  if (role === 'admin') return '/admin/login';
  if (role === 'worker') return '/login/worker';
  return '/login/customer';
}

export function homePathForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'worker') return '/worker';
  return '/customer';
}
