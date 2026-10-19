/**
 * admin-dashboard/src/pages/super-admin/AdminAccountsManager.jsx
 *
 * 1. What this file does:
 *    Management portal for administrative accounts, role delegation, account suspension/activation,
 *    and cryptographic session revocation reserved for Super Administrators.
 * 2. Overall design:
 *    React functional component communicating with /api/v1/admin/admin-users endpoints.
 *    Provides create admin modal, suspend/reactivate toggles with self-suspension protection,
 *    and an immediate "Revoke All Sessions" action to terminate compromised tokens.
 * 3. Elements in the file:
 *    - AdminAccountsManager component.
 *    - Create Admin User modal dialog.
 *    - Revoke Sessions confirmation modal dialog.
 *    - Admin table with email, role badges, active status, creation dates, and action menus.
 * 4. Final output of the file:
 *    Exports default React component AdminAccountsManager.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

const ROLES = ['CONTENT_ADMIN', 'MARKETING', 'VIEWER'];

/**
 * AdminAccountsManager
 *
 * 1. The use of function:
 *    Renders the Super Admin console interface for managing administrative users and sessions.
 * 2. How does the specific function work:
 *    Queries GET /admin/admin-users with pagination, renders status pills and action buttons,
 *    submits new users via POST, toggles status via PATCH :id/status, and revokes sessions via POST :id/revoke-sessions.
 * 3. Concepts used in the function:
 *    RBAC policy enforcement, session invalidation, confirmation modals, defensive guards.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx for the 'super-admins' tab.
 * 5. Final output of the function, before and after:
 *    Before: Initial empty or loading state.
 *    After: Paginated directory of administrators with real-time lifecycle mutation controls.
 *
 * @returns {React.ReactElement}
 */
export default function AdminAccountsManager() {
  const { user: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('CONTENT_ADMIN');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Revoke Modal
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  const fetchAdmins = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/admin-users', { page, pageSize: 10 });
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      setAdmins(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrator accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins(1);
  }, [fetchAdmins]);

  const handleToggleStatus = async (admin) => {
    if (admin.id === currentAdmin?.id) {
      alert('Security Protection: You cannot suspend your own active administrator account.');
      return;
    }

    const nextStatus = !admin.is_active;
    const confirmMsg = nextStatus
      ? `Reactivate account for ${admin.email}?`
      : `Suspend account for ${admin.email}? They will immediately be denied API access.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/admin/admin-users/${admin.id}/status`, { is_active: nextStatus });
      setBannerNotice(`Account for ${admin.email} successfully ${nextStatus ? 'activated' : 'suspended'}.`);
      fetchAdmins(pagination.page);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createEmail.trim() || !createPassword.trim()) {
      setCreateError('Email and password are required.');
      return;
    }
    if (createPassword.length < 8) {
      setCreateError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setCreateSubmitting(true);
      await api.post('/admin/admin-users', {
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        role: createRole,
      });

      setIsCreateOpen(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('CONTENT_ADMIN');
      setBannerNotice(`Admin account created successfully with role ${createRole}.`);
      fetchAdmins(1);
    } catch (err) {
      setCreateError(err.message || 'Failed to create administrator account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!revokeTarget) return;
    try {
      setRevokeSubmitting(true);
      await api.post(`/admin/admin-users/${revokeTarget.id}/revoke-sessions`);
      setBannerNotice(`All active sessions and refresh tokens for ${revokeTarget.email} have been revoked.`);
      setRevokeTarget(null);
    } catch (err) {
      alert(`Session revocation failed: ${err.message}`);
    } finally {
      setRevokeSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Administrator Accounts & Access</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Provision staff credentials, assign role-based permissions, and manage token revocation
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New Admin
        </button>
      </div>

      {/* Banner Notice */}
      {bannerNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0055b8]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{bannerNotice}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-blue-500 hover:text-blue-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading administrator directory...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No administrator accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((adm) => {
                  const isSelf = adm.id === currentAdmin?.id;
                  return (
                    <tr key={adm.id} className="hover:bg-blue-50/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{adm.email}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{adm.id}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold font-mono rounded ${
                          adm.role === 'SUPER_ADMIN'
                            ? 'bg-[#FFCC00] text-slate-950 border border-amber-300'
                            : adm.role === 'CONTENT_ADMIN'
                            ? 'bg-blue-50 text-[#0055b8] border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {adm.role}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(adm)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                            adm.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${adm.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {adm.is_active ? 'Active' : 'Suspended'}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setRevokeTarget(adm)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition"
                          title="Revoke active JWT sessions"
                        >
                          Revoke Sessions
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(newPage) => fetchAdmins(newPage)}
        />
      </div>

      {/* Create Admin Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Provision Administrator Account</h3>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="admin.name@camso.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role & Permissions Scope</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  CONTENT_ADMIN: Full catalogue/document CRUD. MARKETING: Campaigns/testimonials. VIEWER: Read-only.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50 transition"
                >
                  {createSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Sessions Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Revoke All Active Sessions?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to invalidate all active refresh tokens for <strong>{revokeTarget.email}</strong>?
                The user will be immediately logged out on all devices.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revokeSubmitting}
                onClick={handleRevokeSessions}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                {revokeSubmitting ? 'Revoking...' : 'Confirm Revoke Sessions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
