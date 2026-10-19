/**
 * admin-dashboard/src/components/AccessDenied.jsx
 *
 * WHAT THIS FILE DOES:
 *   Renders a secure, fail-closed access-denied screen when an authenticated user
 *   possesses an unrecognized, insufficient, or invalid role for the administrative console.
 *
 * OVERALL DESIGN:
 *   Clean, high-contrast alert screen with explicit error description, user role badge,
 *   and an immediate logout action to protect administrative routes from unauthorized access.
 *
 * ELEMENTS IN THIS FILE:
 *   - AccessDenied component displaying warning shield, role indicator, and sign-out button.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component AccessDenied.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * AccessDenied
 *
 * USE OF FUNCTION:
 *   Blocks unauthorized or unprivileged users from accessing administrative consoles.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Displays an access restriction notice indicating the user's current role and provides
 *   a logout button to clear their session.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Fail-closed security architecture, RBAC violation prevention.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported in admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Rendered Access Denied screen.
 */
export default function AccessDenied() {
  const { user, role, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#072349] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center border border-slate-100">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your account is not authorized to access this administration portal.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 mb-6 text-left">
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-medium">Account:</span>
            <span className="font-semibold">{user?.email || 'Unknown'}</span>
          </div>
          <div className="flex justify-between py-1 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Assigned Role:</span>
            <span className="font-mono font-bold text-rose-600 uppercase">{role || 'NONE'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-2.5 px-4 bg-[#0055b8] hover:bg-[#004394] text-white text-sm font-semibold rounded-lg shadow-md transition"
        >
          Sign Out & Return to Login
        </button>
      </div>
    </div>
  );
}
