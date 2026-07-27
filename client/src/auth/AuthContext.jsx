import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readStoredAuth, writeStoredAuth, clearStoredAuth } from './storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const login = useCallback((role, { token, user }) => {
    writeStoredAuth(role, token, user);
    setAuth({ token, role, user });
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth({ token: null, role: null, user: null });
  }, []);

  const updateUser = useCallback((patch) => {
    setAuth((prev) => {
      const nextUser = { ...prev.user, ...patch };
      writeStoredAuth(prev.role, prev.token, nextUser);
      return { ...prev, user: nextUser };
    });
  }, []);

  const value = useMemo(
    () => ({ ...auth, isAuthenticated: Boolean(auth.token), login, logout, updateUser }),
    [auth, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
