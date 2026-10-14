/**
 * admin-dashboard/src/main.jsx
 *
 * WHAT THIS FILE DOES:
 *   Application bootstrap and entrypoint for the CAMSO Admin CMS Dashboard.
 *   Initializes the React 18 Concurrent Root and mounts the App component into the DOM.
 *
 * OVERALL DESIGN:
 *   Imports React 18 createRoot API from 'react-dom/client'.
 *   Mounts <App /> within <React.StrictMode> to verify side-effect hygiene.
 *
 * ELEMENTS IN THIS FILE:
 *   - createRoot invocation on document.getElementById('root')
 *   - StrictMode wrapping of App
 *
 * FINAL OUTPUT OF THE FILE:
 *   Mounts React application to index.html container element.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
