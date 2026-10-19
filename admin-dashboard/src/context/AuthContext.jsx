/**
 * admin-dashboard/src/context/AuthContext.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides global authentication state, token persistence, and role-based permissions
 *   for the unified CAMSO Admin & Super Admin Web Application.
 *   Enforces fail-closed authentication by connecting exclusively to the backend API
 *   and listening for authorization invalidation events without fabricated mock credentials.
 *
 * OVERALL DESIGN:
 *   React Context API provider (AuthProvider) with custom consumer hook (useAuth).
 *   Authenticates credentials against POST /api/v1/admin-auth/login.
 *   Persists JWT tokens and admin user profiles in browser localStorage.
 *   Exposes role identification and write-permission predicates.
 *
 * ELEMENTS IN THIS FILE:
 *   - AuthContext: React context instance.
 *   - AuthProvider: Provider component managing token state, role state, login, and logout.
 *   - useAuth: Consumer hook for accessing authentication state and helpers.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports AuthProvider component and useAuth hook.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, setAuthToken, getStoredUser, setStoredUser, api } from '../api/client';

const AuthContext = createContext(null);

const RECOGNIZED_ADMIN_ROLES = ['CONTENT_ADMIN', 'MARKETING', 'VIEWER'];
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

/**
 * AuthProvider
 *
 * USE OF FUNCTION:
 *   Wraps application components with authenticated session state, verified role claims,
 *   and administrative login/logout methods.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Reads persisted access token and user metadata from localStorage on startup.
 *   2. Attaches a window listener for 'camso:unauthorized' to immediately purge sessions on 401s.
 *   3. Exposes login(email, password) which posts to the real /admin-auth/login endpoint.
 *      Throws the exact backend error upon failure without fabricating mock tokens.
 *   4. Exposes logout() which purges tokens and user state.
 *   5. Computes role predicates (isSuperAdmin, isAdminRole, canWrite).
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React Context API, custom event pub-sub, secure JWT lifecycle, RBAC predicates.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported in admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Unauthenticated context wrapper.
 *   After: Rendered AuthContext.Provider supplying session context and role predicates.
 *
 * @param {object} props - React props containing children.
 * @returns {React.ReactElement}
 */
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getAuthToken());
  const [user, setUserState] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthToken(null);
      setStoredUser(null);
      setTokenState('');
      setUserState(null);
    };
    window.addEventListener('camso:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('camso:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/admin-auth/login', { email, password });

      const receivedToken =
        res.data?.accessToken ||
        res.data?.token ||
        res.data?.access_token ||
        res.data?.tokens?.accessToken ||
        res.data?.tokens?.access_token;

      const receivedUser =
        res.data?.admin ||
        res.data?.user ||
        res.data?.adminUser ||
        { email, role: 'VIEWER' };

      if (!receivedToken) {
        throw new Error('Authentication succeeded but no access token was returned by the server.');
      }

      setAuthToken(receivedToken);
      setStoredUser(receivedUser);
      setTokenState(receivedToken);
      setUserState(receivedUser);
      return receivedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setTokenState('');
    setUserState(null);
  };

  const currentRole = user?.role || '';
  const isSuperAdmin = currentRole === SUPER_ADMIN_ROLE;
  const isAdminRole = RECOGNIZED_ADMIN_ROLES.includes(currentRole);
  const isAuthorizedRole = isSuperAdmin || isAdminRole;
  const canWrite = isSuperAdmin || currentRole === 'CONTENT_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: currentRole,
        isAuthenticated: Boolean(token),
        isSuperAdmin,
        isAdminRole,
        isAuthorizedRole,
        canWrite,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth
 *
 * USE OF FUNCTION:
 *   Consumer hook for consuming AuthContext state and methods.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Invokes useContext(AuthContext) and returns the current authentication state object.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React useContext hook.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported across dashboard components (App.jsx, Sidebar.jsx, Login.jsx, etc.).
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Authentication context object.
 *
 * @returns {object} AuthContext state and helper methods.
 */
export function useAuth() {
  return useContext(AuthContext);
}
