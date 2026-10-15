/**
 * admin-dashboard/src/components/ErrorBoundary.jsx
 *
 * WHAT THIS FILE DOES:
 *   React Error Boundary component that catches JavaScript runtime errors anywhere in its child
 *   component tree, logs the exception, and displays a graceful fallback UI instead of crashing
 *   into a blank white screen.
 *
 * OVERALL DESIGN:
 *   Standard React class component lifecycle (getDerivedStateFromError, componentDidCatch).
 *   Displays a styled CAMSO Blue & White recovery card with the error description, error stack
 *   toggle, a retry button to reset error state, and a button to navigate back to the overview.
 */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CAMSO Admin ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 max-w-2xl mx-auto my-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Something went wrong in this view</h2>
            <p className="text-sm text-slate-500 mt-1">
              A runtime rendering error occurred. The screen was caught safely to prevent a blank display.
            </p>
          </div>

          {this.state.error && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left font-mono text-xs text-rose-700 max-h-40 overflow-y-auto">
              <p className="font-bold">{this.state.error.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-[#0055b8] hover:bg-[#004394] text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Reload View
            </button>
            {this.props.onNavigateOverview && (
              <button
                onClick={this.props.onNavigateOverview}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Go to Overview
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
