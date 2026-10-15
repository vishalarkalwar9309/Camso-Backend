/**
 * admin-dashboard/src/App.jsx
 *
 * WHAT THIS FILE DOES:
 *   Root administrative dashboard application component styled in the official CAMSO Blue & White theme.
 *   Provides session authentication protection, multi-view tab routing, persistent navigation sidebar,
 *   dynamic top header toolbar with contextual titles, and active view switching.
 *
 * OVERALL DESIGN:
 *   Wraps the entire application inside the AuthProvider.
 *   Evaluates authentication state:
 *     - If unauthenticated: renders the branded Login view.
 *     - If authenticated: renders a responsive master-detail dashboard layout:
 *         Sidebar (left navigation) + Header (top toolbar) + Main Content Area (dynamic tab rendering).
 *   Supported tabs:
 *     - 'overview': Dashboard & Content Analytics
 *     - 'catalogue': Product & Category Explorer
 *     - 'documents': Support Documents & File Attachments CMS
 *     - 'faqs': Knowledge Base & FAQ CMS
 *     - 'testimonials': Customer Stories & Testimonials CMS
 *     - 'dealers': Global Dealers & Distributors Locator CMS
 *     - 'feedback': Voice of Customer & CSV Export Portal
 *     - 'campaigns': Push Broadcast & FCM Dispatch CMS
 *
 * ELEMENTS IN THIS FILE:
 *   - App component (provides AuthProvider wrapper)
 *   - MainAppContent component (renders active tab or login screen based on auth context)
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the root App component mounted in main.jsx.
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import DashboardOverview from './pages/DashboardOverview';
import CatalogueManager from './pages/CatalogueManager';
import DocumentsManager from './pages/DocumentsManager';
import FaqManager from './pages/FaqManager';
import TestimonialsManager from './pages/TestimonialsManager';
import DealersManager from './pages/DealersManager';
import FeedbackManager from './pages/FeedbackManager';
import CampaignsManager from './pages/CampaignsManager';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * MainAppContent
 *
 * USE OF FUNCTION:
 *   Internal layout controller determining whether to render the login view or the authenticated dashboard.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Reads token and role from useAuth().
 *   2. If token is absent or empty, renders <Login /> immediately.
 *   3. If token is present, computes active tab title & subtitle metadata.
 *   4. Renders responsive flex container with Sidebar, Header, and active tab view.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Authentication gating and route protection.
 *   - Declarative tab routing with contextual metadata injection.
 *   - Responsive flexbox application layout in Tailwind CSS.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Used internally by App within the AuthProvider context.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Initialized React DOM.
 *   After: Rendered authenticated Admin Console or Login screen in Blue & White theme.
 */
function MainAppContent() {
  const { token } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');

  if (!token) {
    return <Login />;
  }

  const getTabMeta = () => {
    switch (currentTab) {
      case 'overview':
        return { title: 'Dashboard & Analytics Overview', subtitle: 'Platform KPIs, document downloads, and customer sentiment' };
      case 'catalogue':
        return { title: 'Catalogue & Products Explorer', subtitle: 'Heavy equipment tires, rubber tracks, and engineering specifications' };
      case 'documents':
        return { title: 'Support Documents CMS', subtitle: 'Catalogues, service manuals, warranties, and file attachments' };
      case 'faqs':
        return { title: 'Frequently Asked Questions', subtitle: 'Customer support knowledge base, categories, and answers' };
      case 'testimonials':
        return { title: 'Customer Testimonials', subtitle: 'Fleet performance reviews, case studies, and field validation' };
      case 'dealers':
        return { title: 'Dealers & Distributors Directory', subtitle: 'Global dealer network, CSR contact points, and GPS coordinates' };
      case 'feedback':
        return { title: 'Customer VOC & Feedback', subtitle: 'Voice of Customer review portal and CSV export' };
      case 'campaigns':
        return { title: 'Push Notification Campaigns', subtitle: 'FCM push broadcasts and audience targeting' };
      default:
        return { title: 'CAMSO Admin Console', subtitle: 'Enterprise management' };
    }
  };

  const renderActiveView = () => {
    switch (currentTab) {
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
        return <DashboardOverview />;
    }
  };

  const tabMeta = getTabMeta();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={tabMeta.title} subtitle={tabMeta.subtitle} />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <ErrorBoundary key={currentTab} onNavigateOverview={() => setCurrentTab('overview')}>
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
 *   Application root component.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Wraps MainAppContent with AuthProvider so authentication state is globally available.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React Context Provider pattern.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/main.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Root React element tree.
 */
export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
