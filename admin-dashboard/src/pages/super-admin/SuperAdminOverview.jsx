/**
 * admin-dashboard/src/pages/super-admin/SuperAdminOverview.jsx
 *
 * 1. What this file does:
 *    Renders the Super Admin command center overview, displaying platform KPIs,
 *    live infrastructure diagnostics, pending approval backlog, and quick action cards.
 * 2. Overall design:
 *    Fetches metrics from /admin/system-health and /admin/organizations,
 *    rendering responsive KPI cards, status badges, and governance alert banners.
 * 3. Elements in the file:
 *    - SuperAdminOverview component.
 *    - KPI summary cards (Admins, Products, Documents, Dealers, Pending Approvals).
 *    - System health summary card with DB ping and storage indicators.
 *    - Pending organization approvals preview card.
 * 4. Final output of the file:
 *    Exports default React component SuperAdminOverview.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';

/**
 * SuperAdminOverview
 *
 * 1. The use of function:
 *    Top-level dashboard view for Super Administrators providing executive platform visibility.
 * 2. How does the specific function work:
 *    Queries GET /admin/system-health and GET /admin/organizations?status=PENDING in parallel,
 *    calculates health status indicators, and renders cards with quick navigation triggers.
 * 3. Concepts used in the function:
 *    Promise aggregation, reactive state management, Tailwind responsive KPI grids.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx for the 'super-overview' tab.
 * 5. Final output of the function, before and after:
 *    Before: Empty state or loading spinner.
 *    After: Rendered Super Admin command center with live metrics and approval alerts.
 *
 * @param {object} props
 * @param {function} [props.onNavigate] - Callback to switch active tabs.
 * @returns {React.ReactElement}
 */
export default function SuperAdminOverview({ onNavigate }) {
  const [health, setHealth] = useState(null);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [healthRes, orgsRes] = await Promise.allSettled([
        api.get('/admin/system-health'),
        api.get('/admin/organizations', { status: 'PENDING', pageSize: 5 }),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
        setHealth(healthRes.value.data);
      }
      if (orgsRes.status === 'fulfilled' && orgsRes.value) {
        const raw = orgsRes.value.data || orgsRes.value;
        setPendingOrgs(Array.isArray(raw) ? raw : (raw?.items || []));
      }
    } catch (err) {
      setError(err.message || 'Failed to load platform overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-[#0055b8] border-t-transparent rounded-full mb-2"></div>
        <p className="text-sm">Loading global platform overview...</p>
      </div>
    );
  }

  const counts = health?.counts || {};
  const isHealthy = health?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Top Banner with Platform Status */}
      <div className="bg-gradient-to-r from-[#072349] to-[#003373] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FFCC00] text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
              SUPER ADMIN GOVERNANCE
            </span>
            <span className="text-xs text-blue-200 font-mono">Platform Control Plane</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">Global System Oversight</h2>
          <p className="text-xs text-blue-200/80 mt-0.5">
            Real-time telemetry, administrator access management, and organizational verification pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${
            isHealthy
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span>{isHealthy ? 'All Systems Operational' : 'Platform Issues Detected'}</span>
          </div>
          <button
            onClick={loadData}
            title="Refresh Diagnostics"
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          onClick={() => onNavigate && onNavigate('super-admins')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#0055b8] hover:shadow-sm transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Accounts</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.admins ?? 0}</div>
          <span className="text-[11px] text-[#0055b8] font-semibold mt-1 inline-block">Manage users &rarr;</span>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('super-approvals')}
          className={`p-4 rounded-xl border shadow-xs transition cursor-pointer ${
            (counts.pending_approvals ?? 0) > 0
              ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
              : 'bg-white border-slate-200 hover:border-[#0055b8]'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
          <div className={`text-2xl font-extrabold mt-1 ${
            (counts.pending_approvals ?? 0) > 0 ? 'text-amber-700' : 'text-slate-900'
          }`}>
            {counts.pending_approvals ?? 0}
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 inline-block">Review queue &rarr;</span>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('catalogue')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#0055b8] hover:shadow-sm transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Products</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.products ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 inline-block">Catalogue CMS &rarr;</span>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('documents')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#0055b8] hover:shadow-sm transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Support Docs</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.documents ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 inline-block">View library &rarr;</span>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('dealers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#0055b8] hover:shadow-sm transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dealers / Dist.</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.dealers ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 inline-block">Partner directory &rarr;</span>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('super-system-health')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#0055b8] hover:shadow-sm transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DB Latency</span>
          <div className="text-2xl font-extrabold text-[#0055b8] mt-1">
            {health?.database?.latency_ms !== null ? `${health.database.latency_ms} ms` : 'N/A'}
          </div>
          <span className="text-[11px] text-[#0055b8] font-semibold mt-1 inline-block">Diagnostics &rarr;</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Partner Verification Queue</h3>
              <p className="text-xs text-slate-500">Dealers, Distributors, and OEM organizations awaiting compliance clearance</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('super-approvals')}
              className="text-xs font-bold text-[#0055b8] hover:underline"
            >
              View All ({counts.pending_approvals ?? 0})
            </button>
          </div>

          {pendingOrgs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Zero pending organization verification requests. All partner applications are up to date.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingOrgs.slice(0, 4).map((org) => (
                <div key={org.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{org.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono bg-blue-50 text-[#0055b8] px-1.5 py-0.5 rounded font-bold uppercase">
                        {org.business_type || 'PARTNER'}
                      </span>
                      <span className="text-xs text-slate-500">{org.contact_email || org.city || 'No email provided'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate && onNavigate('super-approvals')}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infrastructure & Services Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Infrastructure Telemetry</h3>
              <p className="text-xs text-slate-500">Core backend services, database ping, storage, and push gateway</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('super-system-health')}
              className="text-xs font-bold text-[#0055b8] hover:underline"
            >
              Detailed Probes &rarr;
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health?.database?.status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900">Supabase PostgreSQL Database</div>
                  <div className="text-[11px] text-slate-500">Round-trip query latency: {health?.database?.latency_ms ?? 0} ms</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                health?.database?.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {health?.database?.status || 'UNKNOWN'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health?.storage?.isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900">Supabase Document Storage</div>
                  <div className="text-[11px] text-slate-500">Bucket: {health?.storage?.bucket || 'Camso documents'}</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                health?.storage?.isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {health?.storage?.status || 'UNCONFIGURED'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health?.firebase?.isReady ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900">Firebase Cloud Messaging (FCM)</div>
                  <div className="text-[11px] text-slate-500">Push broadcast gateway</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                health?.firebase?.isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {health?.firebase?.status || 'MOCK'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
