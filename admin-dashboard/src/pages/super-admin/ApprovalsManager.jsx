/**
 * admin-dashboard/src/pages/super-admin/ApprovalsManager.jsx
 *
 * 1. What this file does:
 *    Approval queue and governance interface for reviewing, clearing, and rejecting partner
 *    organizations (Dealers, Distributors, OEM Partners) with mandatory rejection reasons.
 * 2. Overall design:
 *    Queries /api/v1/admin/organizations with status filters and pagination.
 *    Provides one-click approval with audit confirmation and a modal dialog for rejection
 *    enforcing mandatory justification.
 * 3. Elements in the file:
 *    - ApprovalsManager component.
 *    - Organization details table with status indicators and verification documents.
 *    - Rejection modal requiring mandatory reason input.
 *    - Standardized 5-button pagination.
 * 4. Final output of the file:
 *    Exports default React component ApprovalsManager.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import Pagination from '../../components/Pagination';

/**
 * ApprovalsManager
 *
 * 1. The use of function:
 *    Renders the Super Admin approval workflow for verifying partner organizations.
 * 2. How does the specific function work:
 *    Fetches organizations from GET /admin/organizations with status filtering,
 *    handles approval via PATCH /admin/organizations/:id/status { status: 'APPROVED' },
 *    and handles rejection via PATCH with mandatory reason string.
 * 3. Concepts used in the function:
 *    Governance policies, audit trail compliance, mandatory field validation, controlled forms.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx for the 'super-approvals' tab.
 * 5. Final output of the function, before and after:
 *    Before: Initial empty or loading state.
 *    After: Paginated queue of partner applications with decisioning controls.
 *
 * @returns {React.ReactElement}
 */
export default function ApprovalsManager() {
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [bannerNotice, setBannerNotice] = useState(null);

  // Reject Modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrganizations = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 10 };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/organizations', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      setOrganizations(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load organization approvals.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrganizations(1);
  }, [fetchOrganizations]);

  const handleApprove = async (org) => {
    if (!window.confirm(`Approve organization verification for "${org.name}"?`)) return;

    try {
      setSubmitting(true);
      await api.patch(`/admin/organizations/${org.id}/status`, {
        status: 'APPROVED',
      });
      setBannerNotice(`Organization "${org.name}" has been approved.`);
      fetchOrganizations(pagination.page);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReject = (org) => {
    setRejectTarget(org);
    setRejectionReason('');
    setRejectError(null);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectError('A mandatory rejection reason is required for compliance and partner notification.');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/admin/organizations/${rejectTarget.id}/status`, {
        status: 'REJECTED',
        rejection_reason: rejectionReason.trim(),
      });
      setBannerNotice(`Organization "${rejectTarget.name}" rejected.`);
      setRejectTarget(null);
      fetchOrganizations(pagination.page);
    } catch (err) {
      setRejectError(err.message || 'Failed to record rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Partner Organization Approvals</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Verify business credentials and approve or reject dealer, distributor, and OEM onboarding requests
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {['PENDING', 'APPROVED', 'REJECTED', ''].map((st) => (
            <button
              key={st || 'ALL'}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                statusFilter === st
                  ? 'bg-white text-[#0055b8] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Banner Notice */}
      {bannerNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{bannerNotice}</span>
          <button onClick={() => setBannerNotice(null)} className="text-blue-500 hover:text-blue-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading verification requests...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : organizations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No partner organizations found matching status: {statusFilter || 'ALL'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Partner Type</th>
                  <th className="px-4 py-3">Contact Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => {
                  const isPending = org.status === 'PENDING';
                  return (
                    <tr key={org.id} className="hover:bg-blue-50/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{org.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {org.city ? `${org.city}, ` : ''}{org.country || 'N/A'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-0.5 text-xs font-bold font-mono rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                          {org.business_type || 'DEALER'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div className="text-slate-800 font-medium">{org.contact_email || 'No email'}</div>
                        <div className="text-slate-400">{org.phone || 'No phone'}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${
                          org.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : org.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {org.status}
                        </span>
                        {org.rejection_reason && (
                          <div className="text-[11px] text-rose-600 mt-1 italic">
                            Reason: {org.rejection_reason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-right space-x-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApprove(org)}
                              disabled={submitting}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(org)}
                              disabled={submitting}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Clear</span>
                        )}
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
          onPageChange={(newPage) => fetchOrganizations(newPage)}
        />
      </div>

      {/* Reject Modal with Mandatory Reason */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Reject Organization Verification</h3>
            <p className="text-xs text-slate-500">
              Rejecting <strong>{rejectTarget.name}</strong>. Please provide an explicit compliance or justification reason:
            </p>

            {rejectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {rejectError}
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Incomplete business tax registration documents or unverified territorial dealership license..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
                >
                  {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
