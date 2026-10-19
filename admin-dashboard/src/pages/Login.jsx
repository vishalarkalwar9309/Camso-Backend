/**
 * admin-dashboard/src/pages/Login.jsx
 *
 * WHAT THIS FILE DOES:
 *   Renders the administrator authentication gateway for the CAMSO Admin CMS.
 *   Styled in the official Blue, White, and CEAT Yellow corporate theme.
 *   Displays the uploaded CAMSO brand logo, collects admin credentials, handles
 *   authentication via AuthContext, and stores access tokens.
 *
 * OVERALL DESIGN:
 *   Deep Camso Navy background (#072349) with high-contrast pure white card.
 *   Features prominent official CAMSO logo, CEAT Yellow endorsement tag,
 *   Camso Royal Blue primary action button, and error state alerts.
 *
 * ELEMENTS IN THIS FILE:
 *   - Login component
 *     - email & password input fields
 *     - error alert message banner
 *     - submit action with authentication loading state
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component Login displayed when unauthenticated.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Login
 *
 * USE OF FUNCTION:
 *   Authenticates platform administrators and establishes secured JWT sessions.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Displays official CAMSO logo and CEAT branding.
 *   2. Collects email and password inputs.
 *   3. Calls login(email, password) from useAuth().
 *   4. On success, transitions app view to authenticated CMS dashboard.
 *   5. On failure, renders informative alert feedback.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Controlled React inputs, async authentication, Tailwind corporate styling.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Initial login view.
 *   After: Authenticated session state or visible feedback banner.
 */
export default function Login() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('demo.admin@camso.local');
  const [password, setPassword] = useState('admin@2006');
  const [error, setError] = useState('');

  const PRESET_PERSONAS = [
    {
      label: 'Super Admin (All)',
      email: 'demo.admin@camso.local',
      password: 'admin@2006',
      roleHint: 'Full Governance & CMS (/super-admin/*)',
    },
    {
      label: 'Content Admin',
      email: 'admin@camso.test',
      password: 'admin@2006',
      roleHint: 'Daily CMS (/admin/*)',
    },
  ];

  const handleSelectPreset = (preset) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#072349] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-[#0055b8]/20 to-transparent pointer-events-none blur-3xl"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Camso Logo Container */}
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl shadow-slate-950/40 border-2 border-[#0055b8]/30 mb-4">
          <img
            src="/camso-logo.png"
            alt="CAMSO Logo"
            className="h-14 w-auto object-contain rounded"
          />
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">CAMSO</h2>
        <p className="text-sm text-blue-200/80 font-medium">
          Enterprise Content Management & Telematics Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Quick Preset Selector */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Fast Sign-In Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_PERSONAS.map((preset) => {
                  const isSelected = email === preset.email;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? 'border-[#0055b8] bg-blue-50 text-[#0055b8] font-bold shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold truncate">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">{preset.email}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin Email Address
              </label>
              <div className="mt-1.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@camso.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-md shadow-blue-900/30 text-sm font-bold text-white bg-[#0055b8] hover:bg-[#004394] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0055b8] disabled:opacity-50 transition"
            >
              {loading ? 'Authenticating...' : 'Sign In to CAMSO CMS'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <span className="inline-block text-[11px] font-semibold text-slate-500">
              Protected by Enterprise RBAC &bull; CEAT Group
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
