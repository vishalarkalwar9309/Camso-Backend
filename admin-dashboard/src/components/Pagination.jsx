/**
 * admin-dashboard/src/components/Pagination.jsx
 *
 * WHAT THIS FILE DOES:
 *   Standardized 5-button pagination control component for table navigation.
 *   Provides First (<<), Previous (<), numeric Page X of Y with total item count,
 *   Next (>), and Last (>>) navigation with boundary edge disablement.
 *
 * OVERALL DESIGN:
 *   Stateless presentational component receiving pagination metadata (page, totalPages, total)
 *   and an onPageChange callback function. Styled with Tailwind CSS in the CAMSO Blue theme.
 *
 * ELEMENTS IN THIS FILE:
 *   - Pagination component rendering controls and current offset indicators.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component Pagination.
 */

import React from 'react';

/**
 * Pagination
 *
 * USE OF FUNCTION:
 *   Renders a 5-button paginator for navigating multi-page datasets.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Computes isFirstPage and isLastPage booleans to disable buttons at boundary conditions.
 *   Dispatches onPageChange(targetPage) when buttons are clicked.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Boundary edge evaluation, accessible aria-labels, responsive design.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported across CMS tables (CatalogueManager, DocumentsManager, FaqManager, TestimonialsManager, DealersManager, AuditLogsViewer, AdminAccountsManager).
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Rendered pagination controls.
 *
 * @param {object} props
 * @param {number} props.page - Current 1-indexed page number.
 * @param {number} props.totalPages - Total calculated pages.
 * @param {number} [props.total] - Total count of records.
 * @param {number} [props.pageSize] - Number of records per page.
 * @param {function} props.onPageChange - Callback receiving new page number.
 * @returns {React.ReactElement|null}
 */
export default function Pagination({ page = 1, totalPages = 1, total, pageSize, onPageChange }) {
  if (totalPages <= 1 && (!total || total === 0)) {
    return null;
  }

  const currentPage = Math.max(1, page);
  const maxPages = Math.max(1, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= maxPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600">
      <div>
        {total !== undefined ? (
          <span>
            Showing page <strong className="font-semibold text-slate-900">{currentPage}</strong> of{' '}
            <strong className="font-semibold text-slate-900">{maxPages}</strong>{' '}
            <span className="text-slate-400">({total.toLocaleString()} total items)</span>
          </span>
        ) : (
          <span>
            Page <strong className="font-semibold text-slate-900">{currentPage}</strong> of{' '}
            <strong className="font-semibold text-slate-900">{maxPages}</strong>
          </span>
        )}
      </div>

      <div className="inline-flex items-center gap-1">
        {/* First Page (<<) */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={isFirstPage}
          aria-label="First page"
          title="Jump to first page"
          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#0055b8] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition font-semibold"
        >
          &laquo; First
        </button>

        {/* Previous Page (<) */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Previous page"
          title="Go to previous page"
          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#0055b8] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition font-semibold"
        >
          &lsaquo; Prev
        </button>

        {/* Numeric Badge */}
        <span className="px-3 py-1.5 rounded bg-blue-50 text-[#0055b8] border border-blue-200 font-bold">
          {currentPage} / {maxPages}
        </span>

        {/* Next Page (>) */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Next page"
          title="Go to next page"
          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#0055b8] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition font-semibold"
        >
          Next &rsaquo;
        </button>

        {/* Last Page (>>) */}
        <button
          type="button"
          onClick={() => onPageChange(maxPages)}
          disabled={isLastPage}
          aria-label="Last page"
          title="Jump to last page"
          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#0055b8] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition font-semibold"
        >
          Last &raquo;
        </button>
      </div>
    </div>
  );
}
