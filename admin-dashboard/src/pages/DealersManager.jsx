/**
 * admin-dashboard/src/pages/DealersManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative management interface for the CAMSO Global Dealer and Distributor
 *   Directory in the official Blue & White corporate theme. Enables administrators to view dealers,
 *   filter by country and type, toggle active status, and create or update dealer records with
 *   geographic coordinates and CSR capability.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect, useCallback).
 *   Communicates with backend routes:
 *     - GET   /api/v1/admin/dealers
 *     - POST  /api/v1/admin/dealers
 *     - PATCH /api/v1/admin/dealers/:id
 *   Modal interface for managing partner records with geo-coordinate inputs.
 *   Responsive layout styled in Camso Blue, white cards, and high-contrast tables.
 *
 * ELEMENTS IN THIS FILE:
 *   - DEALER_TYPES constant ('DEALER', 'DISTRIBUTOR')
 *   - DealersManager component
 *     - Query state: dealers, pagination, loading, error, filters
 *     - Modal state: isModalOpen, editingDealer, formData, submitting
 *     - Event handlers: fetchDealers, handleToggleActive, handleSaveDealer, handleOpenCreate, handleOpenEdit
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component DealersManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const DEALER_TYPES = ['DEALER', 'DISTRIBUTOR'];

/**
 * DealersManager
 *
 * USE OF FUNCTION:
 *   Main React view component for managing dealers and distributors in CAMSO Blue & White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Queries GET /api/v1/admin/dealers with country, type, and active status filters.
 *   2. Renders dealers table displaying name, city/country, phone, email, and active status.
 *   3. Supports instant toggle of active status via PATCH /api/v1/admin/dealers/:id.
 *   4. Enables modal-driven creation (POST) and updating (PATCH) with coordinate validation.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React state and memoized API fetching.
 *   - Geographic coordinate inputs and partner classification badges.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White partner locator management console.
 */
export default function DealersManager() {
  const [dealers, setDealers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'DEALER',
    address: '',
    city: '',
    state: '',
    country: 'US',
    geo_lat: 40.7128,
    geo_lng: -74.0060,
    phone: '',
    email: '',
    has_csr: false,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDealers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 15 };
      if (typeFilter) params.type = typeFilter;
      if (countryFilter.trim()) params.country = countryFilter.trim();
      if (activeFilter !== '') params.is_active = activeFilter;

      const res = await api.get('/admin/dealers', params);
      setDealers(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dealers');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, countryFilter, activeFilter]);

  useEffect(() => {
    fetchDealers(1);
  }, [fetchDealers]);

  const handleOpenCreate = () => {
    setEditingDealer(null);
    setFormData({
      name: '',
      type: 'DEALER',
      address: '',
      city: '',
      state: '',
      country: 'US',
      geo_lat: 40.7128,
      geo_lng: -74.0060,
      phone: '',
      email: '',
      has_csr: false,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dealer) => {
    setEditingDealer(dealer);
    setFormData({
      name: dealer.name || '',
      type: dealer.type || 'DEALER',
      address: dealer.address || '',
      city: dealer.city || '',
      state: dealer.state || '',
      country: dealer.country || 'US',
      geo_lat: dealer.geo_lat ?? 0,
      geo_lng: dealer.geo_lng ?? 0,
      phone: dealer.phone || '',
      email: dealer.email || '',
      has_csr: !!dealer.has_csr,
      is_active: !!dealer.is_active,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (dealer) => {
    try {
      const updated = !dealer.is_active;
      await api.patch(`/admin/dealers/${dealer.id}`, { is_active: updated });
      setDealers((prev) =>
        prev.map((d) => (d.id === dealer.id ? { ...d, is_active: updated } : d))
      );
    } catch (err) {
      alert(`Failed to update dealer status: ${err.message}`);
    }
  };

  const handleSaveDealer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        geo_lat: Number(formData.geo_lat),
        geo_lng: Number(formData.geo_lng),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        has_csr: Boolean(formData.has_csr),
        is_active: Boolean(formData.is_active),
      };

      if (editingDealer) {
        await api.patch(`/admin/dealers/${editingDealer.id}`, payload);
      } else {
        await api.post('/admin/dealers', payload);
      }
      setIsModalOpen(false);
      fetchDealers(pagination.page);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dealers & Distributors Directory</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Manage dealer locations, CSR dispatch points, and partner contact info</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Partner
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Partner Types</option>
          {DEALER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter country (e.g. US, CA, FR)..."
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        />
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Dealers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading dealers directory...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : dealers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No partners found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Partner Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dealers.map((dealer) => (
                  <tr key={dealer.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{dealer.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {dealer.geo_lat?.toFixed(4)}, {dealer.geo_lng?.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                        {dealer.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium">{dealer.city}, {dealer.state}</div>
                      <div className="text-xs text-slate-400 font-medium">{dealer.country}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700">{dealer.phone}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[150px]">{dealer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(dealer)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          dealer.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dealer.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {dealer.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(dealer)}
                        className="p-1.5 text-slate-400 hover:text-[#0055b8] hover:bg-blue-50 rounded-lg transition"
                        title="Edit Partner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
            </div>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchDealers(pagination.page - 1)}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchDealers(pagination.page + 1)}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {editingDealer ? 'Edit Partner Details' : 'Add New Partner'}
            </h3>
            <form onSubmit={handleSaveDealer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Dealer Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Partner Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                  >
                    {DEALER_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Country Code</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="US, CA, FR..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 800 555 0199"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@partner.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.geo_lat}
                    onChange={(e) => setFormData({ ...formData, geo_lat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.geo_lng}
                    onChange={(e) => setFormData({ ...formData, geo_lng: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={formData.has_csr}
                    onChange={(e) => setFormData({ ...formData, has_csr: e.target.checked })}
                    className="w-4 h-4 text-[#0055b8] rounded"
                  />
                  Has CSR Support
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#0055b8] rounded"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDealer ? 'Save Changes' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
