/**
 * admin-dashboard/src/pages/FaqManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative management interface for CAMSO Frequently Asked Questions (FAQs)
 *   in the official Blue & White corporate theme. Enables administrators to view, filter by
 *   category/publish status, toggle publication, and create or edit questions and answers.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect, useCallback).
 *   Communicates with backend routes:
 *     - GET   /api/v1/admin/faqs
 *     - POST  /api/v1/admin/faqs
 *     - PATCH /api/v1/admin/faqs/:id
 *   Modal interface for both creating new FAQs and modifying existing ones.
 *   Responsive layout with high-contrast cards and Camso Blue accents.
 *
 * ELEMENTS IN THIS FILE:
 *   - FAQ_CATEGORIES constant ('COMPANY', 'PRODUCT', 'DISTRIBUTION')
 *   - FaqManager component
 *     - Query state: faqs, pagination, loading, error, categoryFilter
 *     - Modal state: isModalOpen, editingFaq, formData, submitting
 *     - Event handlers: fetchFaqs, handleTogglePublish, handleSaveFaq, handleOpenEdit, handleOpenCreate
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component FaqManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const FAQ_CATEGORIES = ['COMPANY', 'PRODUCT', 'DISTRIBUTION'];

/**
 * FaqManager
 *
 * USE OF FUNCTION:
 *   Main React view component for managing customer FAQs in CAMSO Blue & White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Fetches paginated FAQs from GET /api/v1/admin/faqs with category filter.
 *   2. Renders list of FAQs with category pill, sort order, and status indicator.
 *   3. Allows instant status toggling via PATCH /api/v1/admin/faqs/:id.
 *   4. Supports modal-driven creation (POST) and updating (PATCH).
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - Controlled forms, state lifecycle hooks, RESTful API integration.
 *   - Camso Blue buttons, responsive cards, and modal dialog overlays.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White FAQ CMS console.
 */
export default function FaqManager() {
  const [faqs, setFaqs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State (Used for both Create and Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    category: 'PRODUCT',
    question: '',
    answer: '',
    sort_order: 0,
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFaqs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 15 };
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/admin/faqs', params);
      setFaqs(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchFaqs(1);
  }, [fetchFaqs]);

  const handleOpenCreate = () => {
    setEditingFaq(null);
    setFormData({
      category: 'PRODUCT',
      question: '',
      answer: '',
      sort_order: 0,
      is_published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (faq) => {
    setEditingFaq(faq);
    setFormData({
      category: faq.category || 'PRODUCT',
      question: faq.question || '',
      answer: faq.answer || '',
      sort_order: faq.sort_order ?? 0,
      is_published: !!faq.is_published,
    });
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (faq) => {
    try {
      const updated = !faq.is_published;
      await api.patch(`/admin/faqs/${faq.id}`, { is_published: updated });
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, is_published: updated } : f))
      );
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    try {
      setSubmitting(true);
      if (editingFaq) {
        await api.patch(`/admin/faqs/${editingFaq.id}`, {
          category: formData.category,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          sort_order: Number(formData.sort_order),
          is_published: formData.is_published,
        });
      } else {
        await api.post('/admin/faqs', {
          category: formData.category,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          sort_order: Number(formData.sort_order),
          is_published: formData.is_published,
        });
      }
      setIsModalOpen(false);
      fetchFaqs(pagination.page);
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
          <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Manage support questions, categories, and knowledge base items</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add FAQ
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category:</span>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Categories</option>
          {FAQ_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* FAQ Cards */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
          Loading FAQs...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-500 text-sm bg-white rounded-xl border border-slate-200">
          {error}
        </div>
      ) : faqs.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No FAQs found in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-[#0055b8]/40 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-[#0055b8] border border-blue-200">
                      {faq.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Order: {faq.sort_order ?? 0}</span>
                    <button
                      onClick={() => handleTogglePublish(faq)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        faq.is_published
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${faq.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {faq.is_published ? 'Published' : 'Draft'}
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{faq.question}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                  <button
                    onClick={() => handleOpenEdit(faq)}
                    className="p-1.5 text-slate-400 hover:text-[#0055b8] hover:bg-blue-50 rounded-lg transition"
                    title="Edit FAQ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
            </h3>
            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                  >
                    {FAQ_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How do I measure track tension?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Answer</label>
                <textarea
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Detailed resolution instructions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="faqPublish"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-[#0055b8] rounded"
                />
                <label htmlFor="faqPublish" className="text-sm text-slate-700 font-medium">Published</label>
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
                  {submitting ? 'Saving...' : editingFaq ? 'Save Changes' : 'Create FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
