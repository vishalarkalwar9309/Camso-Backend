/**
 * admin-dashboard/src/pages/DocumentsManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative management interface for CAMSO support documents in the
 *   official Blue & White corporate theme. Enables administrators to view paginated documents,
 *   filter by type and publish status, toggle publication, create new documents, and upload
 *   multi-lingual PDF / specification files.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect, useCallback).
 *   Communicates with backend routes:
 *     - GET   /api/v1/admin/documents
 *     - POST  /api/v1/admin/documents
 *     - PATCH /api/v1/admin/documents/:id
 *     - POST  /api/v1/admin/documents/:id/files
 *   Styled with crisp white cards, Camso Blue buttons, and high-contrast tables.
 *
 * ELEMENTS IN THIS FILE:
 *   - DOCUMENT_TYPES constant (CATALOGUE, BROCHURE, MANUAL, TECHNICAL_GUIDE, BULLETIN, WARRANTY, VIDEO)
 *   - DocumentsManager component
 *     - Filters: search, documentType, isPublished, page
 *     - Modals: isCreateOpen, isUploadOpen, selectedDoc
 *     - Action handlers: fetchDocuments, handleTogglePublish, handleCreateDoc, handleUploadFile
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component DocumentsManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const DOCUMENT_TYPES = [
  'CATALOGUE',
  'BROCHURE',
  'MANUAL',
  'TECHNICAL_GUIDE',
  'BULLETIN',
  'WARRANTY',
  'VIDEO',
];

/**
 * DocumentsManager
 *
 * USE OF FUNCTION:
 *   Main React view component for managing support documents in CAMSO Blue & White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Queries GET /api/v1/admin/documents with search, type, and publish filters.
 *   2. Displays documents in a responsive table with status badges and download counts.
 *   3. Offers toggle publication via PATCH /api/v1/admin/documents/:id.
 *   4. Enables modal-driven creation (POST) and multi-lingual attachment upload (multipart).
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React state and memoized fetch lifecycle.
 *   - Standardized API envelope unwrapping.
 *   - Camso Blue primary buttons and high-contrast data table layout.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White support documents management console.
 */
export default function DocumentsManager() {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedType, setSelectedType] = useState('');
  const [publishFilter, setPublishFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('BROCHURE');
  const [newPublished, setNewPublished] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLang, setUploadLang] = useState('en');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 10 };
      if (selectedType) params.document_type = selectedType;
      if (publishFilter !== '') params.is_published = publishFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/admin/documents', params);
      setDocuments(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [selectedType, publishFilter, search]);

  useEffect(() => {
    fetchDocuments(1);
  }, [fetchDocuments]);

  const handleTogglePublish = async (doc) => {
    try {
      const updatedStatus = !doc.is_published;
      await api.patch(`/admin/documents/${doc.id}`, { is_published: updatedStatus });
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_published: updatedStatus } : d))
      );
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreateSubmitting(true);
      await api.post('/admin/documents', {
        title: newTitle.trim(),
        document_type: newType,
        is_published: newPublished,
      });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewType('BROCHURE');
      setNewPublished(false);
      fetchDocuments(1);
    } catch (err) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!uploadFile || !targetDoc) return;
    try {
      setUploadSubmitting(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('language_code', uploadLang);

      await api.upload(`/admin/documents/${targetDoc.id}/files`, formData);
      setIsUploadOpen(false);
      setUploadFile(null);
      setTargetDoc(null);
      fetchDocuments(pagination.page);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Support Documents CMS</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Manage catalogues, service manuals, warranties, and file attachments</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Document
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filter by title or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Document Types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={publishFilter}
          onChange={(e) => setPublishFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0055b8]"
        >
          <option value="">All Statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading documents...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No documents found matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Title & ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Downloads</th>
                  <th className="px-4 py-3">Files</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{doc.title || 'Untitled Document'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-[#0055b8] border border-blue-200">
                        {doc.document_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePublish(doc)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          doc.is_published
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${doc.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {doc.is_published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0055b8]">
                      {doc.download_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {doc.files ? `${doc.files.length} attached` : '0 files'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setTargetDoc(doc);
                          setIsUploadOpen(true);
                        }}
                        className="px-3 py-1 text-xs font-semibold text-[#0055b8] hover:bg-blue-50 rounded border border-blue-200 transition"
                      >
                        Upload File
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
                onClick={() => fetchDocuments(pagination.page - 1)}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchDocuments(pagination.page + 1)}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Document</h3>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 2026 Construction Tracks Catalog"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publishedCheck"
                  checked={newPublished}
                  onChange={(e) => setNewPublished(e.target.checked)}
                  className="w-4 h-4 text-[#0055b8] rounded"
                />
                <label htmlFor="publishedCheck" className="text-sm text-slate-700 font-medium">Publish immediately to app</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {createSubmitting ? 'Saving...' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {isUploadOpen && targetDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Upload Attachment</h3>
            <p className="text-xs text-slate-500">Document: <span className="font-semibold text-slate-800">{targetDoc.title}</span></p>
            <form onSubmit={handleUploadAttachment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Language Code</label>
                <input
                  type="text"
                  required
                  value={uploadLang}
                  onChange={(e) => setUploadLang(e.target.value)}
                  placeholder="en, fr, de, es..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select File (PDF / Doc / Image)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0055b8] hover:file:bg-blue-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSubmitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {uploadSubmitting ? 'Uploading...' : 'Upload Attachment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
