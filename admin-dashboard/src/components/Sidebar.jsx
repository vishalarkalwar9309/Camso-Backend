/**
 * admin-dashboard/src/components/Sidebar.jsx
 *
 * WHAT THIS FILE DOES:
 *   Renders the administrative sidebar navigation menu for the CAMSO Admin CMS in an official
 *   Blue and White enterprise theme with CEAT Yellow accents. Displays the official CAMSO logo,
 *   navigation items for each CMS module, active indicator badges, and admin session logout controls.
 *
 * OVERALL DESIGN:
 *   React functional navigation component integrated with AuthContext.
 *   Styled with Camso Navy (#072349), vibrant Royal Blue active highlights (#0055b8),
 *   white iconography, and CEAT Yellow accents for role badges and focal points.
 *
 * ELEMENTS IN THIS FILE:
 *   - navItems array containing route identifiers, labels, and SVG icon paths.
 *   - Sidebar component rendering branding header, navigation links, and user footer.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported React component Sidebar for rendering in App.jsx.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Sidebar
 *
 * USE OF FUNCTION:
 *   Main navigation controller and brand identity display in the administrative console.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Displays official CAMSO logo in the top brand banner.
 *   2. Reads currentTab and calls setCurrentTab(id) upon click.
 *   3. Highlights active route in Camso Royal Blue with CEAT Yellow accent indicator.
 *   4. Displays logged-in administrator email and RBAC role tag styled in CEAT yellow.
 *   5. Provides logout button triggering session termination.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React context consumption, declarative active tab switching.
 *   - Tailwind CSS corporate theme (Camso Blue & White with CEAT Yellow accent).
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous rose/red sidebar.
 *   After: Branded CAMSO Royal Blue and White navigation sidebar with CEAT Yellow highlights.
 */
export default function Sidebar({ currentTab, setCurrentTab }) {
  const { user, role, logout } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Dashboard & Analytics', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { id: 'catalogue', label: 'Catalogue & Products', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { id: 'documents', label: 'Support Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'faqs', label: 'FAQs CMS', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'testimonials', label: 'Testimonials', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: 'dealers', label: 'Dealers Directory', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
    { id: 'feedback', label: 'Customer VOC & CSV', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { id: 'campaigns', label: 'Push Campaigns', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ];

  return (
    <aside className="w-64 bg-[#072349] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-[#003373]">
      {/* Brand Header with Camso Logo */}
      <div className="h-20 flex items-center px-5 border-b border-[#003373] gap-3 bg-[#051c3b]">
        <img
          src="/camso-logo.png"
          alt="CAMSO"
          className="h-11 w-auto rounded shadow-sm object-contain bg-[#0055b8] p-1 border border-blue-400/30"
        />
        <div>
          <h1 className="font-extrabold text-white text-lg tracking-tight">CAMSO</h1>
          <p className="text-xs text-blue-300 font-medium">Enterprise Admin CMS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">
          Platform Management
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#0055b8] text-white shadow-md shadow-blue-900/40 border-l-4 border-[#FFCC00]'
                  : 'hover:bg-[#0c2f5e] hover:text-white text-blue-100/80'
              }`}
            >
              <svg
                className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#FFCC00]' : 'text-blue-300'}`}
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
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-[#003373] bg-[#051c3b]">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.email || 'admin@camso.com'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block text-[10px] bg-[#FFCC00] text-slate-950 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                {role}
              </span>
              <span className="text-[10px] text-blue-300 font-mono">RBAC</span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out of CMS"
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
