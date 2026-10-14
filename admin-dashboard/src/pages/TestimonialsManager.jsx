/**
 * admin-dashboard/src/pages/TestimonialsManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative management interface for CAMSO Customer Testimonials
 *   in the official Blue & White corporate theme with CEAT Yellow rating accents.
 *   Enables administrators to view customer stories, filter by story type, toggle publication,
 *   and create or edit customer success stories.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect, useCallback).
 *   Communicates with backend routes:
 *     - GET   /api/v1/admin/testimonials
 *     - POST  /api/v1/admin/testimonials
 *     - PATCH /api/v1/admin/testimonials/:id
 *   Modal interface for creating and modifying testimonial entries.
 *   Responsive card grid layout featuring Camso Blue borders and badges.
 *
 * ELEMENTS IN THIS FILE:
 *   - STORY_TYPES constant ('SOLIDS', 'OPERATING_COST', 'WORN_PRODUCT_REPLACEMENT', 'REPEAT_PURCHASE')
 *   - TestimonialsManager component
 *     - Query state: testimonials, pagination, loading, error, typeFilter
 *     - Modal state: isModalOpen, editingItem, formData, submitting
 *     - Event handlers: fetchTestimonials, handleTogglePublish, handleSaveTestimonial, handleOpenCreate, handleOpenEdit
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component TestimonialsManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const STORY_TYPES = [
  'SOLIDS',
  'OPERATING_COST',
  'WORN_PRODUCT_REPLACEMENT',
  'REPEAT_PURCHASE',
];

/**
 * TestimonialsManager
 *
 * USE OF FUNCTION:
 *   Main React view component for managing customer stories in CAMSO Blue & White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Fetches paginated testimonials from GET /api/v1/admin/testimonials with story_type filter.
 *   2. Displays testimonials in a responsive card grid showing customer name, region, and quote.
 *   3. Offers toggle publication via PATCH /api/v1/admin/testimonials/:id.
 *   4. Supports modal-driven creation (POST) and updating (PATCH).
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React state and memoized fetch callbacks.
 *   - Branded card layout with Camso Blue accents and typography.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White testimonial CMS console.
 */
export default function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    region: '',
    story_type: 'OPERATING_COST',
    content: '',
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTestimonials = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 12 };
      if (typeFilter) params.story_type = typeFilter;

      const res = await api.get('/admin/testimonials', params);
      setTestimonials(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTestimonials(1);
  }, [fetchTestimonials]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      customer_name: '',
      region: '',
      story_type: 'OPERATING_COST',
      content: '',
      is_published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      customer_name: item.customer_name || '',
      region: item.region || '',
      story_type: item.story_type || 'OPERATING_COST',
      content: item.content || '',
      is_published: !!item.is_published,
    });
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (item) => {
    try {
      const updated = !item.is_published;
      await api.patch(`/admin/testimonials/${item.id}`, { is_published: updated });
      setTestimonials((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_published: updated } : t))
      );
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSaveTestimonial = async (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.region.trim() || !formData.content.trim()) return;

    try {
      setSubmitting(true);
      if (editingItem) {
        await api.patch(`/admin/testimonials/${editingItem.id}`, {
          customer_name: formData.customer_name.trim(),
          region: formData.region.trim(),
          story_type: formData.story_type,
          content: formData.content.trim(),
          is_published: formData.is_published,
        });
      } else {
        await api.post('/admin/testimonials', {
          customer_name: formData.customer_name.trim(),
          region: formData.region.trim(),
          story_type: formData.story_type,
          content: formData.content.trim(),
          is_published: formData.is_published,
        });
      }
      setIsModalOpen(false);
      fetchTestimonials(pagination.page);
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
          <h2 className="text-xl font-bold text-slate-900">Customer Testimonials CMS</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Manage verified fleet operator reviews, field performance, and case studies</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Testimonial
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Story Type:</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Story Types</option>
          {STORY_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
          Loading testimonials...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-500 text-sm bg-white rounded-xl border border-slate-200">
          {error}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No testimonials found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#0055b8]/40 hover:shadow-sm transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-[#0055b8] border border-blue-200 uppercase tracking-wide">
                    {item.story_type?.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => handleTogglePublish(item)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                      item.is_published
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {item.is_published ? 'Published' : 'Draft'}
                  </button>
                </div>
                <blockquote className="text-sm text-slate-700 italic border-l-3 border-[#0055b8] pl-3 leading-relaxed">
                  "{item.content}"
                </blockquote>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.customer_name}</h4>
                  <p className="text-[11px] text-slate-500">{item.region}</p>
                </div>
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 text-slate-400 hover:text-[#0055b8] hover:bg-blue-50 rounded-lg transition"
                  title="Edit Testimonial"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingItem ? 'Edit Testimonial' : 'Add Testimonial'}
            </h3>
            <form onSubmit={handleSaveTestimonial} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Fleet Name</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. John Miller"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Region / Country</label>
                  <input
                    type="text"
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. Midwest, USA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Story Focus / Type</label>
                <select
                  value={formData.story_type}
                  onChange={(e) => setFormData({ ...formData, story_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                >
                  {STORY_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Story / Quote</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Share customer performance metrics, longevity, and uptime benefits..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testiPublish"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-[#0055b8] rounded"
                />
                <label htmlFor="testiPublish" className="text-sm text-slate-700 font-medium">Published</label>
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
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
