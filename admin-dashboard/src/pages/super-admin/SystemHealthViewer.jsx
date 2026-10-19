/**
 * admin-dashboard/src/pages/super-admin/SystemHealthViewer.jsx
 *
 * 1. What this file does:
 *    Renders deep system telemetry and real-time infrastructure diagnostics for Super Administrators.
 * 2. Overall design:
 *    Probes backend status via /api/v1/admin/system-health, displaying live server metrics,
 *    database query latency, Supabase storage status, and Firebase Cloud Messaging integration health.
 * 3. Elements in the file:
 *    - SystemHealthViewer component.
 *    - Service connectivity status cards (Database, Storage, Push, Node.js).
 *    - Memory allocation visualizers and uptime counter.
 *    - Live diagnostic re-probe trigger.
 * 4. Final output of the file:
 *    Exports default React component SystemHealthViewer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';

/**
 * SystemHealthViewer
 *
 * 1. The use of function:
 *    Renders the Super Admin system health diagnostic monitor.
 * 2. How does the specific function work:
 *    Queries GET /admin/system-health, calculates uptime and memory usage ratios,
 *    and displays status cards with color-coded operational indicators.
 * 3. Concepts used in the function:
 *    Infrastructure monitoring, reactive latency visualizers, memory telemetry.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx for the 'super-system-health' tab.
 * 5. Final output of the function, before and after:
 *    Before: Initial empty or loading state.
 *    After: Live diagnostic dashboard with system status and service probes.
 *
 * @returns {React.ReactElement}
 */
export default function SystemHealthViewer() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [probing, setProbing] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      setProbing(true);
      setError(null);
      const res = await api.get('/admin/system-health');
      setHealth(res.data || res);
    } catch (err) {
      setError(err.message || 'Failed to retrieve system diagnostics.');
    } finally {
      setLoading(false);
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-[#0055b8] border-t-transparent rounded-full mb-2"></div>
        <p className="text-sm">Running platform diagnostic probe...</p>
      </div>
    );
  }

  const isHealthy = health?.status === 'healthy';
  const dbOk = health?.database?.status === 'connected';
  const storageOk = health?.storage?.isReady;
  const fcmOk = health?.firebase?.isReady;
  const sys = health?.system || {};
  const mem = sys.memory || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Health & Infrastructure Diagnostics</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Active service connectivity probes, database latency, storage readiness, and runtime telemetry
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={probing}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${probing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {probing ? 'Probing...' : 'Run Diagnostics Probe'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* PostgreSQL Database */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Engine</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              dbOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {dbOk ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900">Supabase PostgreSQL</h3>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Query Ping:</span>
              <span className="font-bold font-mono text-[#0055b8]">
                {health?.database?.latency_ms !== null ? `${health.database.latency_ms} ms` : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Probe Timeout:</span>
              <span className="font-mono text-slate-700">2000 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">State:</span>
              <span className="font-semibold text-emerald-700">{dbOk ? 'Ready for queries' : 'Unreachable'}</span>
            </div>
          </div>
        </div>

        {/* Supabase Storage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Object Storage</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              storageOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {health?.storage?.status?.toUpperCase() || 'OFFLINE'}
            </span>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900">Supabase Storage</h3>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Bucket:</span>
              <span className="font-bold font-mono text-slate-800">{health?.storage?.bucket || 'Camso documents'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Local Fallback:</span>
              <span className="font-mono text-slate-700">uploads/documents</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Physical Verification:</span>
              <span className="font-semibold text-emerald-700">Enforced</span>
            </div>
          </div>
        </div>

        {/* Firebase Push */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Push Gateway</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              fcmOk ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {health?.firebase?.status?.toUpperCase() || 'UNCONFIGURED'}
            </span>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900">Firebase Cloud Messaging</h3>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Multicast Batching:</span>
              <span className="font-bold font-mono text-slate-800">500 tokens / chunk</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SDK Status:</span>
              <span className="font-mono text-slate-700">{fcmOk ? 'Initialized' : 'Offline / Mock Mode'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery Protection:</span>
              <span className="font-semibold text-emerald-700">Fail-safe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Node Runtime & Memory Telemetry */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Node.js Server Runtime & Memory Usage</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Process Uptime</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{formatUptime(sys.uptime_seconds)}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Node Version</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{sys.node_version || 'N/A'}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Heap Used</span>
            <div className="text-lg font-extrabold text-[#0055b8] mt-0.5">{mem.heap_used_mb ?? 0} MB</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Resident Set (RSS)</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{mem.rss_mb ?? 0} MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
