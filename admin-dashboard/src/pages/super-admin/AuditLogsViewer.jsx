/**
 * admin-dashboard/src/pages/super-admin/AuditLogsViewer.jsx
 *
 * 1. What this file does:
 *    Platform audit log browser and compliance inspector reserved for Super Administrators.
 * 2. Overall design:
 *    Queries immutable audit trails from /api/v1/admin/audit-logs with multi-field filtering
 *    (action, entity type, actor email, date bounds) and offset pagination.
 *    Provides an inspection modal to safely display before-and-after JSON state changes.
 * 3. Elements in the file:
 *    - AuditLogsViewer component.
 *    - Search and filter bar (action, entity type, email, date range).
 *    - Audit log records table.
 *    - JSON changes inspection modal.
 *    - Standardized 5-button pagination.
 * 4. Final output of the file:
 *    Exports default React component AuditLogsViewer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import Pagination from '../../components/Pagination';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'STATUS_CHANGE', 'REVOKE_SESSIONS'];
const ENTITY_TYPES = ['PRODUCT', 'DOCUMENT', 'CATEGORY', 'FAQ', 'TESTIMONIAL', 'DEALER', 'ADMIN_USER', 'ORGANIZATION', 'CAMPAIGN'];

/**
 * AuditLogsViewer
 *
 * 1. The use of function:
 *    Renders the Super Admin audit log viewer for security investigations and regulatory compliance.
 * 2. How does the specific function work:
 *    Issues GET requests to /admin/audit-logs with active filter query parameters,
 *    displays timestamp, actor, action badges, and entity references, and renders JSON diffs on click.
 * 3. Concepts used in the function:
 *    Tamper-evident audit inspection, JSON formatting, debounced filtering, offset pagination.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx for the 'super-audit-logs' tab.
 * 5. Final output of the function, before and after:
 *    Before: Initial empty or loading state.
 *    After: Paginated and filterable audit trail table.
 *
 * @returns {React.ReactElement}
 */
export default function AuditLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actorEmailFilter, setActorEmailFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Log Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 25 };
      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entity_type = entityTypeFilter;
      if (actorEmailFilter.trim()) params.actor_email = actorEmailFilter.trim();
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await api.get('/admin/audit-logs', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      setLogs(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to query platform audit logs.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, actorEmailFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platform Audit Logs & Security Events</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Immutable system-wide activity ledger recording administrative actions, logins, and mutations
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filter by actor email..."
          value={actorEmailFilter}
          onChange={(e) => setActorEmailFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        />

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="From Date"
          className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="To Date"
          className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Querying audit logs ledger...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No audit records found matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => {
                  const hasDetails = log.details || log.changes;
                  return (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </td>

                      <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                        {log.actor_email || log.actor_id || 'System'}
                      </td>

                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'DELETE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action === 'UPDATE' || log.action === 'STATUS_CHANGE'
                            ? 'bg-blue-50 text-[#0055b8] border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 font-sans text-slate-800">
                        {log.entity_type || '—'}
                      </td>

                      <td className="px-4 py-2.5 text-slate-400 truncate max-w-[120px]" title={log.entity_id}>
                        {log.entity_id || '—'}
                      </td>

                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>

                      <td className="px-4 py-2.5 text-right font-sans">
                        {hasDetails ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-[#0055b8] hover:underline font-bold text-xs"
                          >
                            Inspect JSON
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
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
          onPageChange={(newPage) => fetchLogs(newPage)}
        />
      </div>

      {/* JSON Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0055b8]">Audit Record</span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedLog.action} on {selectedLog.entity_type} ({selectedLog.entity_id})
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Actor: {selectedLog.actor_email} &bull; {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedLog.details && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Details</h4>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs overflow-x-auto max-h-48 font-mono">
                  {typeof selectedLog.details === 'object'
                    ? JSON.stringify(selectedLog.details, null, 2)
                    : selectedLog.details}
                </pre>
              </div>
            )}

            {selectedLog.changes && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">State Changes</h4>
                <pre className="p-3 bg-slate-900 text-blue-300 rounded-xl text-xs overflow-x-auto max-h-60 font-mono">
                  {typeof selectedLog.changes === 'object'
                    ? JSON.stringify(selectedLog.changes, null, 2)
                    : selectedLog.changes}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
