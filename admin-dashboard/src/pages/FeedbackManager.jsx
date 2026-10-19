/**
 * admin-dashboard/src/pages/FeedbackManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative management interface for Customer Voice of Customer (VOC) and Feedback
 *   in the official Blue & White corporate theme with CEAT Yellow star rating accents.
 *   Enables administrators to inspect customer ratings, filter by bucket/rating, and export the
 *   entire feedback repository as an RFC 4180 CSV file with one click.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect, useCallback).
 *   Communicates with backend routes:
 *     - GET /api/v1/admin/feedback (paginated list with filters)
 *     - GET /api/v1/admin/feedback/export (returns raw CSV text stream)
 *   Clean white cards, Camso Blue buttons, and high-contrast tables with CEAT Yellow star visualizers.
 *
 * ELEMENTS IN THIS FILE:
 *   - BUCKETS constant ('BUG', 'FEATURE', 'EXPERIENCE', 'CATALOGUE', 'OTHER')
 *   - FeedbackManager component
 *     - State: feedbackList, pagination, loading, error, bucketFilter, ratingFilter, exporting
 *     - Event handlers: fetchFeedback, handleExportCsv, renderStars
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component FeedbackManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import Pagination from '../components/Pagination';

const BUCKETS = ['PRODUCT', 'SERVICE', 'PRICING'];

/**
 * FeedbackManager
 *
 * USE OF FUNCTION:
 *   Main React view component for reviewing end user feedback and exporting CSV datasets in Blue/White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Fetches paginated feedback from GET /api/v1/admin/feedback with bucket and rating filters.
 *   2. Displays customer ratings rendered with CEAT Yellow stars, bucket badge, and comments.
 *   3. Exposes handleExportCsv which calls GET /api/v1/admin/feedback/export, creates a Blob,
 *      and triggers a native browser download for 'camso_feedback_export.csv'.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React state management and useCallback hooks.
 *   - Blob creation and dynamic URL download handling for CSV streams.
 *   - CEAT Yellow star rating indicator generation.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White end user VOC feedback portal with CEAT Yellow star ratings.
 */
export default function FeedbackManager() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [bucketFilter, setBucketFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchFeedback = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 15 };
      if (bucketFilter) params.bucket = bucketFilter;
      if (ratingFilter) params.rating = ratingFilter;

      const res = await api.get('/admin/feedback', params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.feedback || []);
      setFeedbackList(list);
      const meta = res.meta?.pagination || res.meta;
      if (meta && typeof meta.totalPages === 'number') {
        setPagination({
          page: meta.page || 1,
          pageSize: meta.pageSize || 15,
          total: meta.total || list.length,
          totalPages: meta.totalPages || 1,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [bucketFilter, ratingFilter]);

  useEffect(() => {
    fetchFeedback(1);
  }, [fetchFeedback]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csvText = await api.get('/admin/feedback/export');
      
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `camso_feedback_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-[#FFCC00] text-[#FFCC00]' : 'fill-slate-200 text-slate-200'}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">End User Voice of Customer (VOC) & Feedback</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Review end user ratings, application feedback, and export raw datasets to CSV</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Generating CSV...' : 'Export Feedback CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <select
          value={bucketFilter}
          onChange={(e) => setBucketFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Categories (Buckets)</option>
          {BUCKETS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Star Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Feedback Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading customer feedback...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : feedbackList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No feedback submissions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Customer Comment</th>
                  <th className="px-4 py-3">User & Device ID</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feedbackList.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStars(item.rating)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                        {item.bucket}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-slate-800 text-sm font-normal leading-relaxed">{item.comment || 'No comment provided'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      <div>User: {item.user_id ? item.user_id.slice(0, 10) + '...' : 'Anonymous'}</div>
                      <div>Dev: {item.device_id ? item.device_id.slice(0, 12) + '...' : 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
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
          onPageChange={(newPage) => fetchFeedback(newPage)}
        />
      </div>
    </div>
  );
}
