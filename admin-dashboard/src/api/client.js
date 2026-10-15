/**
 * admin-dashboard/src/api/client.js
 *
 * WHAT THIS FILE DOES:
 *   Centralized HTTP network client for the CAMSO Admin CMS Dashboard.
 *   Injects Authorization Bearer tokens, handles JSON and multipart FormData requests,
 *   unpacks standardized ApiResponse envelopes, and triggers global session invalidation on 401s.
 *
 * OVERALL DESIGN:
 *   Wraps native fetch API with standard request options and error handling.
 *   Maintains authentication state in browser localStorage.
 *   Provides structured helper object (api.get, api.post, api.patch, api.put, api.delete, api.upload).
 *
 * ELEMENTS IN THIS FILE:
 *   - getAuthToken / setAuthToken: localStorage token persistence
 *   - getStoredUser / setStoredUser: localStorage user metadata persistence
 *   - apiFetch: Core async fetch engine with envelope unwrapping and CSV stream detection
 *   - api: Exported HTTP convenience client
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported api object and token utility functions.
 */

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://camso-backend.onrender.com/api/v1' : '/api/v1');

/**
 * getAuthToken
 *
 * USE OF FUNCTION:
 *   Retrieves the stored JWT access token from localStorage.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Reads 'camso_admin_token' key from browser localStorage; returns empty string if not found.
 *
 * CONCEPTS USED:
 *   - Web Storage API.
 *
 * PLACES IMPORTED AND USED:
 *   Used in client.js for apiFetch and in AuthContext.jsx for initial state.
 *
 * FINAL OUTPUT:
 *   String representing JWT token or empty string.
 */
export function getAuthToken() {
  return localStorage.getItem('camso_admin_token') || '';
}

/**
 * setAuthToken
 *
 * USE OF FUNCTION:
 *   Persists or removes the JWT access token in localStorage.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   If token is provided, sets 'camso_admin_token'; otherwise removes the key.
 *
 * CONCEPTS USED:
 *   - Web Storage API.
 *
 * PLACES IMPORTED AND USED:
 *   Used in AuthContext.jsx upon login/logout.
 *
 * FINAL OUTPUT:
 *   Updates localStorage state.
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('camso_admin_token', token);
  } else {
    localStorage.removeItem('camso_admin_token');
  }
}

/**
 * getStoredUser
 *
 * USE OF FUNCTION:
 *   Retrieves the serialized admin user profile object from localStorage.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Reads 'camso_admin_user', parses JSON safely; returns null on error or empty.
 *
 * CONCEPTS USED:
 *   - JSON parsing with exception guard.
 *
 * PLACES IMPORTED AND USED:
 *   Used in AuthContext.jsx for initial user state.
 *
 * FINAL OUTPUT:
 *   Parsed user object or null.
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('camso_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * setStoredUser
 *
 * USE OF FUNCTION:
 *   Persists or clears the admin user profile in localStorage.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   Serializes user object to JSON and sets 'camso_admin_user'; removes if null.
 *
 * CONCEPTS USED:
 *   - JSON serialization and Web Storage.
 *
 * PLACES IMPORTED AND USED:
 *   Used in AuthContext.jsx upon login/logout.
 *
 * FINAL OUTPUT:
 *   Updates localStorage state.
 */
export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('camso_admin_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('camso_admin_user');
  }
}

/**
 * apiFetch
 *
 * USE OF FUNCTION:
 *   Executes HTTP network request with token injection, JSON serialization, and response parsing.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Appends BASE_URL if relative path provided.
 *   2. Attaches Authorization Bearer token header if available.
 *   3. Serializes body to JSON if object provided (skips FormData).
 *   4. If response is 401, clears tokens and dispatches 'camso:unauthorized'.
 *   5. If response is text/csv, returns raw text directly.
 *   6. Parses JSON and verifies success envelope; throws normalized Error if failed.
 *
 * CONCEPTS USED:
 *   - Fetch API, CustomEvent, MIME type inspection, standardized API envelopes.
 *
 * PLACES IMPORTED AND USED:
 *   Used internally by api helper methods (get, post, patch, etc.).
 *
 * FINAL OUTPUT:
 *   Parsed response JSON payload or raw CSV text.
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Handle JSON bodies automatically (unless FormData is passed)
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (response.status === 401) {
    setAuthToken(null);
    setStoredUser(null);
    window.dispatchEvent(new CustomEvent('camso:unauthorized'));
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    const text = await response.text();
    return text;
  }

  const json = await response.json();
  if (!response.ok || json.success === false) {
    const message = json.error?.message || json.message || 'API request failed';
    const err = new Error(message);
    err.details = json.error?.details || null;
    err.status = response.status;
    throw err;
  }

  return json;
}

export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const full = query ? `${endpoint}?${query}` : endpoint;
    return apiFetch(full, { method: 'GET' });
  },
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body }),
  put: (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
  upload: (endpoint, formData) => {
    return apiFetch(endpoint, {
      method: 'POST',
      body: formData,
    });
  },
};
