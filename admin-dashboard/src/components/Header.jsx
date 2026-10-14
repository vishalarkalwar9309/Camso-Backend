/**
 * admin-dashboard/src/components/Header.jsx
 *
 * WHAT THIS FILE DOES:
 *   Renders the top application header bar in the clean Blue and White theme.
 *   Provides dynamic section title, Swagger API documentation link, live API status badge,
 *   and CEAT enterprise endorsement indicator.
 *
 * OVERALL DESIGN:
 *   Crisp white background with soft borders and Camso Blue interactive buttons.
 *   Sticky positioning at top of viewport for persistent navigational awareness.
 *
 * ELEMENTS IN THIS FILE:
 *   - Header component with title, subtitle, documentation trigger, status badge, and custom actions slot.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component Header for rendering in App.jsx.
 */

import React from 'react';

/**
 * Header
 *
 * USE OF FUNCTION:
 *   Renders the persistent top navigation and status toolbar for the CAMSO Admin Console.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Displays active section title and descriptive subtitle.
 *   2. Displays Swagger interactive documentation link styled in Camso Blue.
 *   3. Displays pulsing live API connected status pill.
 *   4. Renders optional actions passed via props.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Stateless React presentation, sticky top bar, accessible SVG icons.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Generic gray header.
 *   After: Branded Blue and White top navigation toolbar.
 */
export default function Header({ title, subtitle, actions }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title || 'CAMSO Admin Console'}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-[#0055b8] hover:text-[#004394] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
        >
          <span>Swagger Docs</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>API Connected</span>
        </div>
        {actions}
      </div>
    </header>
  );
}
