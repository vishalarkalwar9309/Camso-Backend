/**
 * admin-dashboard/src/pages/DashboardOverview.jsx
 *
 * WHAT THIS FILE DOES:
 *   Renders the executive KPI overview and real-time content analytics dashboard in the
 *   official CAMSO Blue & White corporate theme with CEAT Yellow satisfaction rating accents.
 *   Aggregates metrics from:
 *     - GET /api/v1/admin/analytics/content (Aary's TASK-07 endpoint: document downloads & VOC ratings)
 *     - GET /api/v1/admin/analytics/catalogue (Vishal's catalogue discovery metrics: top searches & bookmarks)
 *
 * OVERALL DESIGN:
 *   High-contrast Blue & White layout featuring branded KPI cards with CEAT Yellow accents.
 *   Provides real-time metric refresh, download volume tracking, and customer sentiment distribution charts.
 *
 * ELEMENTS IN THIS FILE:
 *   - DashboardOverview component
 *     - State: contentMetrics, catalogueMetrics, loading
 *     - fetchMetrics handler
 *     - KPI statistics display and CEAT Yellow rating distribution progress bars
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component DashboardOverview rendered on the overview tab.
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * DashboardOverview
 *
 * USE OF FUNCTION:
 *   Renders the central analytics and operational KPIs in CAMSO Blue & White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Queries /api/v1/admin/analytics/content to gather total downloads, top documents, and VOC sentiment breakdown.
 *   2. Queries /api/v1/admin/analytics/catalogue for search discovery and bookmark trends.
 *   3. If any endpoint is offline during development, provides realistic fallback data.
 *   4. Renders interactive KPI cards and CEAT Yellow rating distribution bars.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React state management, Promise.allSettled error handling.
 *   - Visual data distribution bars using Tailwind CSS percentage widths and CEAT brand yellow.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red/rose overview.
 *   After: Branded Blue, White, and CEAT Yellow executive analytics dashboard.
 */
export default function DashboardOverview() {
  const [contentMetrics, setContentMetrics] = useState(null);
  const [catalogueMetrics, setCatalogueMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  const fetchMetrics = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setErrorNotice(null);
    try {
      const [cRes, catRes] = await Promise.allSettled([
        api.get('/admin/analytics/content'),
        api.get('/admin/analytics/catalogue'),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value?.data) {
        setContentMetrics(cRes.value.data);
      } else if (cRes.status === 'rejected') {
        console.warn('Failed to load content metrics:', cRes.reason);
      }

      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        setCatalogueMetrics(catRes.value.data);
      } else if (catRes.status === 'rejected') {
        console.warn('Failed to load catalogue metrics:', catRes.reason);
      }

      if (cRes.status === 'rejected' && catRes.status === 'rejected') {
        setErrorNotice('Unable to reach analytics endpoints. Metrics display last recorded data.');
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setErrorNotice(err.message || 'Error refreshing metrics');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
  }, []);

  // 30-second periodic refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const totalDownloads = contentMetrics?.total_downloads || 0;
  const avgRating = Number(contentMetrics?.feedback_summary?.avg_rating || 0).toFixed(1);
  const totalFeedback = contentMetrics?.feedback_summary?.total_feedback || 0;
  const ratingBreakdown = contentMetrics?.feedback_summary?.rating_breakdown || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  const totalSearches = (catalogueMetrics?.top_searches || []).reduce(
    (acc, curr) => acc + (curr.hit_count || curr.count || 0),
    0
  );

  const bookmarkList = catalogueMetrics?.most_bookmarked_products || catalogueMetrics?.top_bookmarked_products || [];
  const totalBookmarks = bookmarkList.reduce(
    (acc, curr) => acc + (curr.bookmark_count || curr.count || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Overview Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">Dashboard & Analytics Overview</h2>
            <span className="text-[10px] font-bold bg-[#0055b8] text-white px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
              {autoRefresh ? 'Periodic Refresh: 30s' : 'Refresh Paused'}
            </span>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 font-mono">
                Updated {lastUpdated}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Operational metrics computed from production database (periodic 30s polling)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-[#0055b8] focus:ring-[#0055b8]"
            />
            <span>Auto-Refresh</span>
          </label>

          <button
            onClick={() => fetchMetrics(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-900/20 transition disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Now
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <span>{errorNotice}</span>
          <button onClick={() => fetchMetrics(false)} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Document Downloads */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs border-t-4 border-t-[#0055b8] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Downloads</span>
            <p className="text-3xl font-extrabold text-[#0055b8] mt-2">{totalDownloads.toLocaleString()}</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded">
            <span>Live Document Repo</span>
          </div>
        </div>

        {/* End User Sentiment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs border-t-4 border-t-[#FFCC00] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">End User Sentiment (VOC)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{avgRating}</span>
              <span className="text-xs font-bold text-[#F5B800]">/ 5.0</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 font-medium bg-amber-50 px-2 py-1 rounded">
            Across <span className="font-bold text-slate-800">{totalFeedback}</span> end-user reviews
          </div>
        </div>

        {/* Product Queries */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs border-t-4 border-t-[#0055b8] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Discoveries</span>
            <p className="text-3xl font-extrabold text-[#0055b8] mt-2">
              {totalSearches.toLocaleString()}
            </p>
          </div>
          <div className="mt-4 text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded">
            Search Queries Logged
          </div>
        </div>

        {/* Saved Bookmarks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs border-t-4 border-t-[#072349] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saved Bookmarks</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {totalBookmarks.toLocaleString()}
            </p>
          </div>
          <div className="mt-4 text-xs text-slate-700 font-semibold bg-slate-100 px-2 py-1 rounded">
            Active User Bookmarks
          </div>
        </div>
      </div>

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Downloaded Support Documents */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 tracking-tight mb-4 flex items-center justify-between">
            <span>Top Downloaded Documents</span>
            <span className="text-xs font-bold text-[#0055b8] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Support Library
            </span>
          </h3>

          <div className="space-y-3">
            {contentMetrics?.top_documents?.length > 0 ? (
              contentMetrics.top_documents.map((doc, idx) => (
                <div key={doc.id || idx} className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-blue-50/40 rounded-xl border border-slate-200 transition">
                  <div className="truncate pr-4">
                    <p className="text-sm font-bold text-slate-800 truncate">{doc.title}</p>
                    <span className="inline-block text-[11px] font-mono text-[#0055b8] uppercase font-semibold mt-0.5">
                      {doc.document_type}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-slate-900">{doc.download_count || 0}</span>
                    <p className="text-[10px] text-slate-500 font-medium">downloads</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">No document downloads recorded yet.</p>
            )}
          </div>
        </div>

        {/* End User Feedback VOC Rating Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 tracking-tight mb-4 flex items-center justify-between">
            <span>End User Satisfaction Breakdown</span>
            <span className="text-xs font-bold text-slate-900 bg-[#FFCC00] px-2.5 py-0.5 rounded">
              VOC Rating
            </span>
          </h3>

          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingBreakdown[String(star)] || 0;
              const pct = totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-14 font-bold text-slate-700">{star} Stars</span>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FFCC00] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="w-16 text-right font-semibold text-slate-600">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-around text-center">
            <div>
              <p className="text-xs font-medium text-slate-500">Product Quality</p>
              <p className="text-lg font-bold text-[#0055b8] mt-0.5">{contentMetrics?.feedback_summary?.bucket_counts?.PRODUCT || 0}</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <p className="text-xs font-medium text-slate-500">Service & CSR</p>
              <p className="text-lg font-bold text-[#0055b8] mt-0.5">{contentMetrics?.feedback_summary?.bucket_counts?.SERVICE || 0}</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pricing & Value</p>
              <p className="text-lg font-bold text-[#0055b8] mt-0.5">{contentMetrics?.feedback_summary?.bucket_counts?.PRICING || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
