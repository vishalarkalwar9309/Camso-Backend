/**
 * admin-dashboard/src/pages/CampaignsManager.jsx
 *
 * 1. What this file does:
 *    Administrative push notification campaign manager for dispatching Firebase Cloud Messaging (FCM)
 *    broadcasts to target audience segments (all users, specific business roles, languages, or countries).
 * 2. Overall design:
 *    Connects to /api/v1/admin/campaigns and /api/v1/admin/campaigns/:id/send.
 *    Replaces blocking browser alerts with inline feedback banners, enforces debounced dispatch buttons
 *    to prevent duplicate in-flight requests, accurately reports multicast counts, and integrates
 *    the standardized 5-button Pagination component.
 * 3. Elements in the file:
 *    - TARGET_TYPES constant ('ALL_USERS', 'BUSINESS_TYPE', 'LANGUAGE', 'COUNTRY').
 *    - CampaignsManager component.
 *    - Create Campaign modal dialog.
 *    - Send Broadcast confirmation modal with in-flight spinner.
 *    - Real-time result banner displaying targetCount, successCount, and failureCount.
 *    - 5-button Pagination control.
 * 4. Final output of the file:
 *    Exports default React component CampaignsManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const TARGET_TYPES = ['ALL_USERS', 'BUSINESS_TYPE', 'LANGUAGE', 'COUNTRY'];

/**
 * CampaignsManager
 *
 * 1. The use of function:
 *    Renders the Push Campaigns CMS view in the CAMSO Admin Console.
 * 2. How does the specific function work:
 *    Queries GET /admin/campaigns, presents target audience selectors, creates campaigns via POST,
 *    and executes multicast push dispatch via POST :id/send while managing loading states.
 * 3. Concepts used in the function:
 *    Multicast messaging, debounce protection, non-blocking alert banners, server-side pagination.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx.
 * 5. Final output of the function, before and after:
 *    Before: Campaign manager with blocking alerts and duplicate click risks.
 *    After: Robust push management console with accurate FCM delivery feedback.
 *
 * @returns {React.ReactElement}
 */
export default function CampaignsManager() {
  const { canWrite } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
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
  const [createError, setCreateError] = useState(null);

  // Send Confirmation Modal
  const [confirmSendCampaign, setConfirmSendCampaign] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState(null);

  const fetchCampaigns = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 15 };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/campaigns', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || raw?.campaigns || []);
      setCampaigns(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns(1);
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!formData.name.trim()) {
      setCreateError('Campaign name is required.');
      return;
    }

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
      setCreateError(err.message || 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSend = async () => {
    if (!confirmSendCampaign || sending) return;
    try {
      setSending(true);
      setSendError(null);
      const res = await api.post(`/admin/campaigns/${confirmSendCampaign.id}/send`);
      const data = res.data || res;
      setSendResult({
        campaignName: confirmSendCampaign.name,
        targetCount: data.targetCount ?? data.totalTokens ?? 0,
        successCount: data.successCount ?? 0,
        failureCount: data.failureCount ?? 0,
        mode: data.mode || (data.successCount === 0 && data.failureCount === 0 ? 'MOCK / OFFLINE' : 'DISPATCHED'),
      });
      setConfirmSendCampaign(null);
      fetchCampaigns(pagination.page);
    } catch (err) {
      setSendError(err.message || 'Push dispatch failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Push Notification Campaigns</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Draft targeted broadcasts and dispatch Firebase Cloud Messaging alerts to field devices
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Campaign
          </button>
        )}
      </div>

      {/* Send Result Banner */}
      {sendResult && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex items-center justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h4 className="font-bold text-sm">Campaign &ldquo;{sendResult.campaignName}&rdquo; Dispatched</h4>
            </div>
            <p className="text-xs text-blue-800 mt-0.5">
              Targeted: <strong>{sendResult.targetCount}</strong> devices &bull; Success: <strong>{sendResult.successCount}</strong> &bull; Failures: <strong>{sendResult.failureCount}</strong>
              {sendResult.mode && <span className="ml-2 font-mono text-[10px] bg-blue-100 text-[#0055b8] px-1.5 py-0.5 rounded font-bold uppercase">{sendResult.mode}</span>}
            </p>
          </div>
          <button
            onClick={() => setSendResult(null)}
            className="text-xs font-bold text-[#0055b8] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        {['', 'DRAFT', 'SCHEDULED', 'SENT', 'FAILED'].map((st) => (
          <button
            key={st || 'ALL'}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              statusFilter === st
                ? 'bg-[#0055b8] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st || 'All Campaigns'}
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading campaign broadcasts...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No campaigns found matching the status filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Campaign Name & ID</th>
                  <th className="px-4 py-3">Target Audience</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{camp.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{camp.id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                        {camp.target_type}
                      </span>
                      {camp.target_value && (
                        <span className="ml-2 text-xs text-slate-600 font-medium">({camp.target_value})</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${
                        camp.status === 'SENT'
                          ? 'bg-emerald-50 text-emerald-700'
                          : camp.status === 'FAILED'
                          ? 'bg-rose-50 text-rose-700'
                          : camp.status === 'SCHEDULED'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {camp.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {camp.created_at ? new Date(camp.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {canWrite && camp.status === 'DRAFT' && (
                        <button
                          onClick={() => {
                            setSendError(null);
                            setConfirmSendCampaign(camp);
                          }}
                          className="px-3 py-1 bg-[#0055b8] hover:bg-[#004394] text-white rounded text-xs font-bold transition shadow-xs"
                        >
                          Send Now
                        </button>
                      )}
                      {camp.status === 'SENT' && (
                        <span className="text-xs text-emerald-700 font-semibold">Delivered</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(newPage) => fetchCampaigns(newPage)}
        />
      </div>

      {/* Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Push Campaign</h3>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Winter 2026 Tire Maintenance Bulletin"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {formData.target_type !== 'ALL_USERS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Value ({formData.target_type})
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder={
                      formData.target_type === 'BUSINESS_TYPE'
                        ? 'e.g. DEALER or DISTRIBUTOR'
                        : formData.target_type === 'LANGUAGE'
                        ? 'e.g. en, fr, es'
                        : 'e.g. US, CA, DE'
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#0055b8] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Dispatch Push Campaign?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to broadcast &ldquo;<strong>{confirmSendCampaign.name}</strong>&rdquo;
                to <strong>{confirmSendCampaign.target_type}</strong> devices?
              </p>
            </div>

            {sendError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {sendError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => setConfirmSendCampaign(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleExecuteSend}
                className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold disabled:opacity-50 transition flex items-center gap-2"
              >
                {sending && <span className="inline-block animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />}
                {sending ? 'Dispatching...' : 'Confirm & Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
