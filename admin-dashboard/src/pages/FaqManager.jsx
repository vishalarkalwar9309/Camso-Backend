/**
 * admin-dashboard/src/pages/FaqManager.jsx
 *
 * 1. What this file does:
 *    Administrative knowledge base management interface for CAMSO Frequently Asked Questions (FAQs).
 *    Enables administrators to view, filter, create, edit, and toggle publication for questions and answers.
 * 2. Overall design:
 *    Connects to /api/v1/admin/faqs endpoints.
 *    Provides modal-driven CRUD with localized question/answer input fields,
 *    order ranking, and standardized 5-button Pagination navigation.
 * 3. Elements in the file:
 *    - FAQ_CATEGORIES constant ('COMPANY', 'PRODUCT', 'DISTRIBUTION', 'GENERAL', 'MAINTENANCE').
 *    - FaqManager component.
 *    - Create/Edit FAQ modal dialog with validation feedback.
 *    - Category filtering tabs and sort order indicators.
 *    - 5-button Pagination component.
 * 4. Final output of the file:
 *    Exports default React component FaqManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const FAQ_CATEGORIES = ['COMPANY', 'PRODUCT', 'DISTRIBUTION', 'GENERAL', 'MAINTENANCE'];

/**
 * FaqManager
 *
 * 1. The use of function:
 *    Renders the FAQ CMS interface in the CAMSO Admin Console.
 * 2. How does the specific function work:
 *    Queries GET /admin/faqs with category filter and pagination,
 *    submits new entries via POST, updates entries via PATCH, and toggles publication.
 * 3. Concepts used in the function:
 *    Controlled forms, modal lifecycle, server-side pagination, RBAC guards.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx.
 * 5. Final output of the function, before and after:
 *    Before: Simple FAQ list with 2-button pagination.
 *    After: Full-featured FAQ CMS with category tabs and 5-button pagination.
 *
 * @returns {React.ReactElement}
 */
export default function FaqManager() {
  const { canWrite } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
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
  const [modalError, setModalError] = useState(null);

  const fetchFaqs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 15 };
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/admin/faqs', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || raw?.faqs || []);
      setFaqs(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load FAQs.');
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
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (faq) => {
    setEditingFaq(faq);
    setFormData({
      category: faq.category || 'PRODUCT',
      question: faq.question || '',
      answer: faq.answer || '',
      sort_order: faq.sort_order || 0,
      is_published: Boolean(faq.is_published),
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (faq) => {
    if (!canWrite) return;
    try {
      const nextPublished = !faq.is_published;
      await api.patch(`/admin/faqs/${faq.id}`, { is_published: nextPublished });
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, is_published: nextPublished } : f))
      );
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.question.trim() || !formData.answer.trim()) {
      setModalError('Both Question and Answer fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingFaq) {
        await api.patch(`/admin/faqs/${editingFaq.id}`, {
          category: formData.category,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          sort_order: parseInt(formData.sort_order, 10) || 0,
          is_published: formData.is_published,
        });
      } else {
        await api.post('/admin/faqs', {
          category: formData.category,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          sort_order: parseInt(formData.sort_order, 10) || 0,
          is_published: formData.is_published,
        });
      }

      setIsModalOpen(false);
      fetchFaqs(pagination.page);
    } catch (err) {
      setModalError(err.message || 'Failed to save FAQ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Knowledge Base & FAQ CMS</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Manage customer support knowledge base, product technical advice, and answers
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
            Add FAQ
          </button>
        )}
      </div>

      {/* Category Tabs Filter */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            categoryFilter === ''
              ? 'bg-[#0055b8] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Categories
        </button>
        {FAQ_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              categoryFilter === cat
                ? 'bg-[#0055b8] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQs List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading knowledge base...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No FAQs found matching the selected category.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-5 hover:bg-blue-50/20 transition flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                      {faq.category}
                    </span>
                    <button
                      onClick={() => handleTogglePublish(faq)}
                      disabled={!canWrite}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        faq.is_published
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      } disabled:opacity-50`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${faq.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {faq.is_published ? 'Published' : 'Draft'}
                    </button>
                    {faq.sort_order !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono">Rank #{faq.sort_order}</span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{faq.question}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>

                {canWrite && (
                  <div className="flex md:flex-col justify-end items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(faq)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#0055b8] hover:bg-blue-50 rounded border border-blue-200 transition"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(newPage) => fetchFaqs(newPage)}
        />
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
            </h3>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {FAQ_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sort Order / Priority</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question *</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How do I measure proper rubber track tension?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Answer *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide technical instructions or resolution guidance..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="faqPubCheck"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-[#0055b8] rounded"
                />
                <label htmlFor="faqPubCheck" className="text-xs font-semibold text-slate-700">Published</label>
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
