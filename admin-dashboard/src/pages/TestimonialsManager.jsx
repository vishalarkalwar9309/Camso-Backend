/**
 * admin-dashboard/src/pages/TestimonialsManager.jsx
 *
 * 1. What this file does:
 *    Administrative customer stories and testimonials moderation CMS for CAMSO equipment reviews.
 *    Enables administrators to view testimonials, filter by story type, create new entries, edit entries,
 *    hide reviews from public mobile view, or permanently delete testimonials with confirmation dialogs.
 * 2. Overall design:
 *    Connects to /api/v1/admin/testimonials endpoints.
 *    Distinguishes "Hide from Public" (routine moderation) from permanent deletion (cascade removal),
 *    and utilizes the standardized 5-button Pagination component.
 * 3. Elements in the file:
 *    - STORY_TYPES constant ('SOLIDS', 'OPERATING_COST', 'WORN_PRODUCT_REPLACEMENT', 'REPEAT_PURCHASE').
 *    - TestimonialsManager component.
 *    - Create/Edit Testimonial modal dialog.
 *    - Delete Testimonial confirmation modal dialog.
 *    - 5-button Pagination control.
 * 4. Final output of the file:
 *    Exports default React component TestimonialsManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const STORY_TYPES = [
  'SOLIDS',
  'OPERATING_COST',
  'WORN_PRODUCT_REPLACEMENT',
  'REPEAT_PURCHASE',
];

/**
 * TestimonialsManager
 *
 * 1. The use of function:
 *    Renders the customer stories moderation interface in the CAMSO Admin Console.
 * 2. How does the specific function work:
 *    Queries GET /admin/testimonials with story_type filter, supports creation (POST),
 *    editing (PATCH), publish status toggling, and permanent deletion (DELETE :id).
 * 3. Concepts used in the function:
 *    Content moderation, confirmation safeguards, cascade deletion handling, server-side pagination.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx.
 * 5. Final output of the function, before and after:
 *    Before: Testimonial manager lacking deletion modal and 5-button pagination.
 *    After: Full moderation suite with Hide vs Delete confirmation workflows.
 *
 * @returns {React.ReactElement}
 */
export default function TestimonialsManager() {
  const { canWrite } = useAuth();
  const [testimonials, setTestimonials] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  // Create / Edit Modal State
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
  const [modalError, setModalError] = useState(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchTestimonials = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 12 };
      if (typeFilter) params.story_type = typeFilter;

      const res = await api.get('/admin/testimonials', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || raw?.testimonials || []);
      setTestimonials(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load testimonials.');
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
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      customer_name: item.customer_name || '',
      region: item.region || '',
      story_type: item.story_type || 'OPERATING_COST',
      content: item.content || '',
      is_published: Boolean(item.is_published),
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (item) => {
    if (!canWrite) return;
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
    setModalError(null);

    if (!formData.customer_name.trim() || !formData.region.trim() || !formData.content.trim()) {
      setModalError('Customer name, region, and story content are required.');
      return;
    }

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
      setModalError(err.message || 'Failed to save testimonial.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTestimonial = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      await api.delete(`/admin/testimonials/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTestimonials(pagination.page);
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Testimonials & Case Studies</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Manage verified fleet operator reviews, field performance validation, and story moderation
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Testimonial
          </button>
        )}
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
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Testimonials Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading customer testimonials...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : testimonials.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No testimonials found matching the criteria.</div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#0055b8] transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                        {item.story_type}
                      </span>
                      <button
                        onClick={() => handleTogglePublish(item)}
                        disabled={!canWrite}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                          item.is_published
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        } disabled:opacity-50`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {item.is_published ? 'Published' : 'Hidden'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      &ldquo;{item.content}&rdquo;
                    </p>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.customer_name}</h4>
                      <p className="text-[11px] text-slate-400">{item.region}</p>
                    </div>
                  </div>

                  {canWrite && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleTogglePublish(item)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        {item.is_published ? 'Hide from Public' : 'Publish'}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0055b8] hover:bg-blue-50 rounded border border-blue-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(newPage) => fetchTestimonials(newPage)}
        />
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingItem ? 'Edit Testimonial' : 'Add Testimonial'}
            </h3>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveTestimonial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Fleet Name *</label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="e.g. Apex Mining Contractors"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Region / Location *</label>
                <input
                  type="text"
                  required
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g. Western Australia"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Story Type</label>
                <select
                  value={formData.story_type}
                  onChange={(e) => setFormData({ ...formData, story_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {STORY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Testimonial Content *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Review quote detailing tire durability, operating hours, and payback..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testPubCheck"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-[#0055b8] rounded"
                />
                <label htmlFor="testPubCheck" className="text-xs font-semibold text-slate-700">Published to Mobile App</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Permanently Delete Testimonial?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete the testimonial from <strong>{deleteTarget.customer_name}</strong>?
                This action is irreversible and cascades associated bookmarks.
              </p>
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg mt-3">
                <strong>Tip:</strong> If you simply wish to take this testimonial off the mobile app, click &ldquo;Hide from Public&rdquo; instead.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteTestimonial}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                {deleteSubmitting ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
