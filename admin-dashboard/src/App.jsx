/**
 * admin-dashboard/src/App.jsx
 *
 * WHAT THIS FILE DOES:
 *   Root application component for the unified CAMSO Web Application.
 *   Provides authenticated session management, bidirectional browser URL synchronization
 *   between /admin/* and /super-admin/* routes, role-aware routing, persistent navigation
 *   sidebar, contextual header bar, and fail-closed security for unprivileged accounts.
 *
 * OVERALL DESIGN:
 *   Wraps the application tree in AuthProvider.
 *   Evaluates session state, pathnames, and verified role claims:
 *     - If unauthenticated: forces /login path and renders <Login />.
 *     - If user role is unrecognized or unauthorized: renders <AccessDenied />.
 *     - If user role is SUPER_ADMIN: synchronizes /super-admin/* governance tabs
 *       and permits inspection of /admin/* operational CMS tabs.
 *     - If user role is in [CONTENT_ADMIN, MARKETING, VIEWER]: restricts navigation
 *       strictly to /admin/* operational tabs; direct /super-admin/* navigation is blocked.
 *     - Synchronizes window.history (pushState/replaceState/popstate) with active tabs.
 *
 * ELEMENTS IN THIS FILE:
 *   - TAB_TO_PATH & PATH_TO_TAB: bidirectional URL path mapping dictionaries.
 *   - resolveInitialTab: helper determining initial tab from browser pathname and role.
 *   - MainAppContent: component managing tab state, popstate listener, and active view rendering.
 *   - App: root wrapper providing AuthProvider context.
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports default root App component mounted in main.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import AccessDenied from './components/AccessDenied';
import ErrorBoundary from './components/ErrorBoundary';

// Admin Dashboard Operational Pages
import DashboardOverview from './pages/DashboardOverview';
import CatalogueManager from './pages/CatalogueManager';
import DocumentsManager from './pages/DocumentsManager';
import FaqManager from './pages/FaqManager';
import TestimonialsManager from './pages/TestimonialsManager';
import DealersManager from './pages/DealersManager';
import FeedbackManager from './pages/FeedbackManager';
import CampaignsManager from './pages/CampaignsManager';

// Super Admin Governance Pages
import SuperAdminOverview from './pages/super-admin/SuperAdminOverview';
import AdminAccountsManager from './pages/super-admin/AdminAccountsManager';
import ApprovalsManager from './pages/super-admin/ApprovalsManager';
import AuditLogsViewer from './pages/super-admin/AuditLogsViewer';
import SystemHealthViewer from './pages/super-admin/SystemHealthViewer';

const TAB_TO_PATH = {
  // Super Admin Governance Views
  'super-overview': '/super-admin/overview',
  'super-admins': '/super-admin/admins',
  'super-approvals': '/super-admin/approvals',
  'super-audit-logs': '/super-admin/audit-logs',
  'super-system-health': '/super-admin/system-health',

  // Day-to-Day Operational Views
  'overview': '/admin/overview',
  'catalogue': '/admin/catalogue',
  'documents': '/admin/documents',
  'faqs': '/admin/faqs',
  'testimonials': '/admin/testimonials',
  'dealers': '/admin/dealers',
  'feedback': '/admin/feedback',
  'campaigns': '/admin/campaigns',
};

const PATH_TO_TAB = {
  '/super-admin': 'super-overview',
  '/super-admin/': 'super-overview',
  '/super-admin/overview': 'super-overview',
  '/super-admin/admins': 'super-admins',
  '/super-admin/approvals': 'super-approvals',
  '/super-admin/audit-logs': 'super-audit-logs',
  '/super-admin/system-health': 'super-system-health',

  '/admin': 'overview',
  '/admin/': 'overview',
  '/admin/overview': 'overview',
  '/admin/catalogue': 'catalogue',
  '/admin/documents': 'documents',
  '/admin/faqs': 'faqs',
  '/admin/testimonials': 'testimonials',
  '/admin/dealers': 'dealers',
  '/admin/feedback': 'feedback',
  '/admin/campaigns': 'campaigns',
};

/**
 * resolveInitialTab
 *
 * USE OF FUNCTION:
 *   Resolves the initial tab identifier from current browser pathname and user role.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Reads window.location.pathname and normalizes trailing slashes.
 *   2. Matches pathname against PATH_TO_TAB lookup table.
 *   3. If candidate tab requires Super Admin but user is not Super Admin, returns 'overview'.
 *   4. If matched, returns candidate tab; otherwise returns role default.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Path matching, defensive role gating, fail-closed fallback.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Called internally by MainAppContent useState initializer.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Unresolved URL state.
 *   After: Validated tab ID string corresponding to URL and authorization tier.
 *
 * @param {boolean} isSuperAdmin - True if current user is SUPER_ADMIN.
 * @returns {string} Initial tab identifier.
 */
function resolveInitialTab(isSuperAdmin) {
  if (typeof window === 'undefined') return isSuperAdmin ? 'super-overview' : 'overview';
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  const candidate = PATH_TO_TAB[path];
  if (candidate) {
    if (candidate.startsWith('super-') && !isSuperAdmin) {
      return 'overview';
    }
    return candidate;
  }
  return isSuperAdmin ? 'super-overview' : 'overview';
}

/**
 * MainAppContent
 *
 * USE OF FUNCTION:
 *   Controls role-based view routing, browser URL synchronization, and security guards.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Reads token, role, isSuperAdmin, and isAuthorizedRole from useAuth().
 *   2. Enforces /login URL when unauthenticated and renders <Login />.
 *   3. Enforces <AccessDenied /> when role is unrecognized or unauthorized.
 *   4. Initializes tab from window.location.pathname and listens for browser popstate events.
 *   5. On navigation, updates currentTab state and pushes new URL to window.history.
 *   6. Prevents non-super-admins from opening any /super-admin/* routes.
 *   7. Renders Sidebar, Header, and active view within an ErrorBoundary.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Fail-closed RBAC routing, HTML5 History API synchronization, contextual metadata.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Rendered internally by root App component.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Initial un-synchronized view.
 *   After: Rendered role-authorized dashboard layout with synchronized browser address bar.
 *
 * @returns {React.ReactElement}
 */
function MainAppContent() {
  const { token, role, isSuperAdmin, isAuthorizedRole } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => resolveInitialTab(isSuperAdmin));

  // Bidirectional popstate listener (handles browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const matched = PATH_TO_TAB[path];
      if (matched) {
        if (matched.startsWith('super-') && !isSuperAdmin) {
          setCurrentTab('overview');
          window.history.replaceState({ tab: 'overview' }, '', '/admin/overview');
        } else {
          setCurrentTab(matched);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSuperAdmin]);

  // Sync tab and URL on authentication or role changes
  useEffect(() => {
    if (!token) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
      return;
    }

    if (isAuthorizedRole) {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const matched = PATH_TO_TAB[path];

      if (matched) {
        if (matched.startsWith('super-') && !isSuperAdmin) {
          setCurrentTab('overview');
          window.history.replaceState({ tab: 'overview' }, '', '/admin/overview');
        } else {
          setCurrentTab(matched);
        }
      } else {
        const defaultTab = isSuperAdmin ? 'super-overview' : 'overview';
        const defaultPath = isSuperAdmin ? '/super-admin/overview' : '/admin/overview';
        setCurrentTab(defaultTab);
        window.history.replaceState({ tab: defaultTab }, '', defaultPath);
      }
    }
  }, [token, isSuperAdmin, isAuthorizedRole]);

  // Navigate tab and synchronize browser history
  const handleTabChange = useCallback((newTab) => {
    let targetTab = newTab;
    if (targetTab.startsWith('super-') && !isSuperAdmin) {
      targetTab = 'overview';
    }

    setCurrentTab(targetTab);
    const targetPath = TAB_TO_PATH[targetTab] || (isSuperAdmin ? '/super-admin/overview' : '/admin/overview');
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: targetTab }, '', targetPath);
    }
  }, [isSuperAdmin]);

  // Fail-closed authentication gate
  if (!token) {
    return <Login />;
  }

  // Fail-closed authorization gate
  if (!isAuthorizedRole) {
    return <AccessDenied />;
  }

  // Defensive fallback: non-super-admins cannot view super-* tabs
  const effectiveTab = (!isSuperAdmin && currentTab.startsWith('super-')) ? 'overview' : currentTab;

  const getTabMeta = () => {
    switch (effectiveTab) {
      // Super Admin Governance Views
      case 'super-overview':
        return { title: 'Global Platform Overview', subtitle: 'Platform KPIs, governance metrics, and system diagnostics' };
      case 'super-admins':
        return { title: 'Administrator Accounts & Access', subtitle: 'Staff credentials, role assignment, and token revocation' };
      case 'super-approvals':
        return { title: 'Partner Organization Approvals', subtitle: 'Compliance review for dealers, distributors, and OEM registrations' };
      case 'super-audit-logs':
        return { title: 'Platform Audit Logs & Security Events', subtitle: 'Immutable administrative audit trails and mutation records' };
      case 'super-system-health':
        return { title: 'System Health & Infrastructure Diagnostics', subtitle: 'Database query ping, object storage status, and push gateway readiness' };

      // Day-to-Day Operational Views
      case 'overview':
        return { title: 'Dashboard & Analytics Overview', subtitle: 'Content metrics, downloads, and customer VOC breakdown' };
      case 'catalogue':
        return { title: 'Catalogue & Products Management', subtitle: 'Heavy equipment tires, rubber tracks, dimensions, and specifications' };
      case 'documents':
        return { title: 'Support Documents CMS', subtitle: 'Catalogues, service manuals, warranties, and file version replacements' };
      case 'faqs':
        return { title: 'Frequently Asked Questions CMS', subtitle: 'Customer support knowledge base, categories, and answers' };
      case 'testimonials':
        return { title: 'Customer Testimonials CMS', subtitle: 'Fleet performance reviews, story moderation, and case studies' };
      case 'dealers':
        return { title: 'Dealers & Distributors Directory', subtitle: 'Global dealer network, CSR contact points, and GPS coordinates' };
      case 'feedback':
        return { title: 'Customer VOC & Feedback', subtitle: 'Voice of Customer review portal and RFC 4180 CSV export' };
      case 'campaigns':
        return { title: 'Push Notification Campaigns', subtitle: 'FCM push broadcasts, audience targeting, and dispatch telemetry' };
      default:
        return { title: 'CAMSO Administration Console', subtitle: 'Enterprise management' };
    }
  };

  const renderActiveView = () => {
    switch (effectiveTab) {
      // Super Admin Views
      case 'super-overview':
        return <SuperAdminOverview onNavigate={handleTabChange} />;
      case 'super-admins':
        return <AdminAccountsManager />;
      case 'super-approvals':
        return <ApprovalsManager />;
      case 'super-audit-logs':
        return <AuditLogsViewer />;
      case 'super-system-health':
        return <SystemHealthViewer />;

      // Operational Views
      case 'overview':
        return <DashboardOverview />;
      case 'catalogue':
        return <CatalogueManager />;
      case 'documents':
        return <DocumentsManager />;
      case 'faqs':
        return <FaqManager />;
      case 'testimonials':
        return <TestimonialsManager />;
      case 'dealers':
        return <DealersManager />;
      case 'feedback':
        return <FeedbackManager />;
      case 'campaigns':
        return <CampaignsManager />;
      default:
        return isSuperAdmin ? <SuperAdminOverview onNavigate={handleTabChange} /> : <DashboardOverview />;
    }
  };

  const tabMeta = getTabMeta();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentTab={effectiveTab} setCurrentTab={handleTabChange} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={tabMeta.title} subtitle={tabMeta.subtitle} />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <ErrorBoundary
            key={effectiveTab}
            onNavigateOverview={() => handleTabChange(isSuperAdmin ? 'super-overview' : 'overview')}
          >
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/**
 * App
 *
 * USE OF FUNCTION:
 *   Root application wrapper providing AuthProvider context.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Renders MainAppContent wrapped inside AuthProvider.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React context provider hierarchy.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Mounted in admin-dashboard/src/main.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Unwrapped component tree.
 *   After: Mounted React component tree with global authentication context.
 *
 * @returns {React.ReactElement}
 */
export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
