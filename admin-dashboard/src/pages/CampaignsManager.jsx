/**
 * admin-dashboard/src/pages/CampaignsManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative management interface for Outbound Push Notification Campaigns
 *   in the official Blue & White corporate theme. Enables marketing and system administrators to
 *   create targeted campaigns (ALL_USERS, BUSINESS_TYPE, LANGUAGE, COUNTRY), inspect status, and
 *   trigger the security-critical FCM send pipeline.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect, useCallback).
 *   Communicates with backend routes:
 *     - GET  /api/v1/admin/campaigns
 *     - POST /api/v1/admin/campaigns
 *     - POST /api/v1/admin/campaigns/:id/send
 *   Features audience targeting badges, modal drafting, and confirmation dialogs.
 *
 * ELEMENTS IN THIS FILE:
 *   - TARGET_TYPES constant ('ALL_USERS', 'BUSINESS_TYPE', 'LANGUAGE', 'COUNTRY')
 *   - CampaignsManager component
 *     - Query state: campaigns, pagination, loading, error, statusFilter
 *     - Modal state: isCreateOpen, formData, submitting, sendConfirmModal, sendingCampaign
 *     - Event handlers: fetchCampaigns, handleCreateCampaign, handleSendCampaign
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component CampaignsManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const TARGET_TYPES = ['ALL_USERS', 'BUSINESS_TYPE', 'LANGUAGE', 'COUNTRY'];

/**
 * CampaignsManager
 *
 * USE OF FUNCTION:
 *   Main React view component for managing push campaigns in CAMSO Blue & White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Queries GET /api/v1/admin/campaigns with status filter.
 *   2. Displays campaigns list with audience targeting badge and status pill.
 *   3. Exposes 'Send Now' action for DRAFT campaigns that issues POST /api/v1/admin/campaigns/:id/send.
 *   4. Displays FCM send dispatch summary banner.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Asynchronous mutation flows, modal safety confirmation, and token dispatch.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White push campaign console.
 */
export default function CampaignsManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    target_type: 'ALL_USERS',
    target_value: '',
    scheduled_at: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Send Confirmation Modal
  const [confirmSendCampaign, setConfirmSendCampaign] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const fetchCampaigns = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 15 };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/campaigns', params);
      setCampaigns(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns(1);
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        target_type: formData.target_type,
        target_value: formData.target_type === 'ALL_USERS' ? null : formData.target_value.trim(),
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
      };

      await api.post('/admin/campaigns', payload);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        target_type: 'ALL_USERS',
        target_value: '',
        scheduled_at: '',
      });
      fetchCampaigns(1);
    } catch (err) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSend = async () => {
    if (!confirmSendCampaign) return;
    try {
      setSending(true);
      const res = await api.post(`/admin/campaigns/${confirmSendCampaign.id}/send`);
      setSendResult(res.data || { success: true });
      fetchCampaigns(pagination.page);
    } catch (err) {
      alert(`Send failed: ${err.message}`);
    } finally {
      setSending(false);
      setConfirmSendCampaign(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Push Notification Campaigns</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Draft targeted broadcasts and dispatch Firebase Cloud Messaging push alerts</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Campaign
        </button>
      </div>

      {/* Send Result Banner */}
      {sendResult && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm">FCM Push Broadcast Dispatched!</h4>
            <p className="text-xs text-blue-700 mt-0.5">
              Targeted: {sendResult.targetCount ?? 0} devices | Success: {sendResult.successCount ?? 0} | Failures: {sendResult.failureCount ?? 0}
            </p>
          </div>
          <button
            onClick={() => setSendResult(null)}
            className="text-[#0055b8] hover:underline text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="SCHEDULED">SCHEDULED</option>
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading campaigns...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No campaigns found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Audience Targeting</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Scheduled / Sent At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                          {c.target_type}
                        </span>
                        {c.target_value && (
                          <span className="text-xs text-slate-600 font-medium">({c.target_value})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.status === 'SCHEDULED'
                            ? 'bg-blue-50 text-[#0055b8]'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : 'Immediate dispatch'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'DRAFT' && (
                        <button
                          onClick={() => setConfirmSendCampaign(c)}
                          className="px-3.5 py-1.5 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold shadow-sm transition"
                        >
                          Send Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
            </div>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchCampaigns(pagination.page - 1)}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCampaigns(pagination.page + 1)}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Push Campaign</h3>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Winter Tire Discount Announcement"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {formData.target_type !== 'ALL_USERS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Criteria Value ({formData.target_type})
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder={
                      formData.target_type === 'LANGUAGE'
                        ? 'e.g. en or fr'
                        : formData.target_type === 'COUNTRY'
                        ? 'e.g. US or CA'
                        : 'e.g. OEM or DEALER'
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Schedule Dispatch (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Confirmation Modal */}
      {confirmSendCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0055b8] flex items-center justify-center mx-auto border border-blue-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Dispatch Push Campaign?</h3>
              <p className="text-xs text-slate-500">
                You are about to trigger FCM push notifications for: <br />
                <span className="font-bold text-[#0055b8]">"{confirmSendCampaign.name}"</span>
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendCampaign(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleExecuteSend}
                className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {sending ? 'Dispatching...' : 'Yes, Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
