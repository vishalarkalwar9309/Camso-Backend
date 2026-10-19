/**
 * admin-dashboard/src/components/Sidebar.jsx
 *
 * WHAT THIS FILE DOES:
 *   Renders the administrative sidebar navigation menu for the unified CAMSO Web Application
 *   in the official Blue and White corporate theme with CEAT Yellow accents.
 *   Provides role-aware navigation: Super Administrators receive both global governance modules
 *   and day-to-day catalogue management, while standard Admins receive daily operations modules only.
 *
 * OVERALL DESIGN:
 *   React functional navigation component integrated with AuthContext.
 *   Styled with Camso Navy (#072349), vibrant Royal Blue active highlights (#0055b8),
 *   white iconography, and CEAT Yellow badges for Super Admin recognition.
 *
 * ELEMENTS IN THIS FILE:
 *   - SUPER_ADMIN_NAV_ITEMS array: Governance routes (Overview, Admins, Approvals, Audit Logs, System Health).
 *   - DAY_TO_DAY_NAV_ITEMS array: Operational CMS routes (Catalogue, Documents, FAQs, Testimonials, Dealers, VOC, Campaigns).
 *   - ADMIN_NAV_ITEMS array: Standard Admin routes.
 *   - Sidebar component rendering branding header, role-governed navigation groups, and user footer.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component Sidebar for rendering in App.jsx.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

const SUPER_ADMIN_GOVERNANCE_ITEMS = [
  { id: 'super-overview', label: 'Global Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'super-admins', label: 'Admin Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'super-approvals', label: 'Approval Queue', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'super-audit-logs', label: 'Audit Logs & Security', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { id: 'super-system-health', label: 'System Health', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

const STANDARD_CMS_ITEMS = [
  { id: 'catalogue', label: 'Catalogue & Products', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'documents', label: 'Support Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'faqs', label: 'FAQs Knowledge Base', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'testimonials', label: 'Customer Testimonials', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { id: 'dealers', label: 'Dealers Directory', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { id: 'feedback', label: 'End User VOC & CSV', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { id: 'campaigns', label: 'Push Campaigns', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
];

const ADMIN_PRIMARY_ITEMS = [
  { id: 'overview', label: 'Dashboard & Analytics', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  ...STANDARD_CMS_ITEMS,
];

/**
 * Sidebar
 *
 * USE OF FUNCTION:
 *   Main navigation controller and brand identity display in the administrative console.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Displays official CAMSO logo in the top brand banner.
 *   2. Inspects role from useAuth(). If SUPER_ADMIN, renders governance and operational navigation groups.
 *      If standard Admin, renders operational navigation group only.
 *   3. Calls setCurrentTab(id) upon click.
 *   4. Displays logged-in administrator email and role badge.
 *   5. Provides logout button triggering session termination.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Role-based UI gating, accessible SVG icons, active indicator styling in Tailwind.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Rendered role-aware navigation sidebar.
 *
 * @param {object} props
 * @param {string} props.currentTab - Currently active tab identifier.
 * @param {function} props.setCurrentTab - Setter for switching tabs.
 * @returns {React.ReactElement}
 */
export default function Sidebar({ currentTab, setCurrentTab }) {
  const { user, role, isSuperAdmin, logout } = useAuth();

  const renderNavButton = (item) => {
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setCurrentTab(item.id)}
        className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
          isActive
            ? 'bg-[#0055b8] text-white shadow-md shadow-blue-900/40 border-l-4 border-[#FFCC00]'
            : 'hover:bg-[#0c2f5e] hover:text-white text-blue-100/80'
        }`}
      >
        <svg
          className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFCC00]' : 'text-blue-300'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
        </svg>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 bg-[#072349] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-[#003373]">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-5 border-b border-[#003373] gap-3 bg-[#051c3b]">
        <img
          src="/camso-logo.png"
          alt="CAMSO"
          className="h-11 w-auto rounded shadow-sm object-contain bg-[#0055b8] p-1 border border-blue-400/30"
        />
        <div>
          <h1 className="font-extrabold text-white text-lg tracking-tight">CAMSO</h1>
          <p className="text-[11px] text-blue-300 font-medium">
            {isSuperAdmin ? 'Super Admin Console' : 'Admin Console'}
          </p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {isSuperAdmin ? (
          <>
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-bold text-[#FFCC00] uppercase tracking-wider flex items-center justify-between">
                <span>Global Governance</span>
                <span className="text-[9px] bg-amber-400/20 text-[#FFCC00] px-1 py-0.2 rounded font-mono">SUPER</span>
              </div>
              <div className="space-y-1">
                {SUPER_ADMIN_GOVERNANCE_ITEMS.map(renderNavButton)}
              </div>
            </div>

            <div className="pt-2 border-t border-[#0c2f5e]">
              <div className="px-3 pb-1.5 text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">
                Catalogue & Content Ops
              </div>
              <div className="space-y-1">
                {STANDARD_CMS_ITEMS.map(renderNavButton)}
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">
              CAMSO Admin Operations
            </div>
            <div className="space-y-1">
              {ADMIN_PRIMARY_ITEMS.map(renderNavButton)}
            </div>
          </div>
        )}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-[#003373] bg-[#051c3b]">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.email || 'admin@camso.com'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                isSuperAdmin ? 'bg-[#FFCC00] text-slate-950' : 'bg-blue-900 text-blue-200'
              }`}>
                {role}
              </span>
              <span className="text-[10px] text-blue-300 font-mono">RBAC</span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-blue-300 hover:text-[#FFCC00] hover:bg-[#0c2f5e] rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
