/**
 * admin-dashboard/src/pages/DocumentsManager.jsx
 *
 * 1. What this file does:
 *    Administrative support documents CMS for CAMSO engineering catalogues, manuals, and bulletins.
 *    Enables administrators to view documents, inspect attached file metadata (filename, size, MIME type,
 *    timestamps), upload multi-lingual files, execute versioned file replacements, and manage publication state.
 * 2. Overall design:
 *    Connects to /api/v1/admin/documents and /api/v1/admin/documents/:id/files.
 *    Provides explicit "Replace File (New Version)" modal displaying current vs proposed file metadata,
 *    and utilizes the standardized 5-button Pagination component.
 * 3. Elements in the file:
 *    - DocumentsManager component.
 *    - Create Document modal dialog.
 *    - Upload Attachment modal dialog.
 *    - Replace File (New Version) modal dialog.
 *    - Responsive document table with file metadata badges and 5-button pagination.
 * 4. Final output of the file:
 *    Exports default React component DocumentsManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

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
 * formatBytes
 *
 * 1. The use of function:
 *    Formats raw file size bytes into human-readable KB or MB strings.
 * 2. How does the specific function work:
 *    Divides bytes by 1024 / 1048576 with appropriate precision.
 * 3. Concepts used in the function:
 *    Byte calculation.
 * 4. Places where this function is imported and used:
 *    Helper in DocumentsManager.
 * 5. Final output of the function, before and after:
 *    Returns formatted string (e.g. "4.2 MB").
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * DocumentsManager
 *
 * 1. The use of function:
 *    Renders the Support Documents CMS in the CAMSO Admin Console.
 * 2. How does the specific function work:
 *    Queries GET /admin/documents with type, publish status, and search filters.
 *    Displays file metadata, executes status toggling, handles new document creation,
 *    and supports file replacement with version history preservation.
 * 3. Concepts used in the function:
 *    Multipart FormData uploads, file replacement validation, server-side pagination.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx.
 * 5. Final output of the function, before and after:
 *    Before: Document table lacking file metadata and version replacement workflows.
 *    After: Complete document and file versioning manager with metadata display.
 *
 * @returns {React.ReactElement}
 */
export default function DocumentsManager() {
  const { canWrite } = useAuth();
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

  // Upload Attachment Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLang, setUploadLang] = useState('en');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Replace File Modal
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState(null);
  const [currentFileMeta, setCurrentFileMeta] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 10 };
      if (selectedType) params.document_type = selectedType;
      if (publishFilter !== '') params.is_published = publishFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/admin/documents', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || raw?.documents || []);
      setDocuments(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [selectedType, publishFilter, search]);

  useEffect(() => {
    fetchDocuments(1);
  }, [fetchDocuments]);

  const handleTogglePublish = async (doc) => {
    if (!canWrite) return;
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

  const handleOpenReplace = (doc) => {
    setReplaceDoc(doc);
    const primaryFile = doc.files?.[0] || null;
    setCurrentFileMeta(primaryFile);
    setReplacementFile(null);
    setIsReplaceOpen(true);
  };

  const handleConfirmReplace = async (e) => {
    e.preventDefault();
    if (!replacementFile || !replaceDoc) return;
    try {
      setReplaceSubmitting(true);
      const formData = new FormData();
      formData.append('file', replacementFile);
      formData.append('language_code', currentFileMeta?.language_code || 'en');

      await api.upload(`/admin/documents/${replaceDoc.id}/files`, formData);
      setIsReplaceOpen(false);
      setReplacementFile(null);
      setReplaceDoc(null);
      fetchDocuments(pagination.page);
    } catch (err) {
      alert(`Replacement failed: ${err.message}`);
    } finally {
      setReplaceSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Support Documents CMS</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Manage technical service manuals, brochures, warranties, file versions, and language attachments
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-900/20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Document
          </button>
        )}
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
                  <th className="px-4 py-3">Document Title & ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Downloads</th>
                  <th className="px-4 py-3">Active File & Metadata</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const activeFile = doc.files?.[0] || null;
                  const asset = activeFile?.media_asset || activeFile;
                  return (
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
                          disabled={!canWrite}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                            doc.is_published
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          } disabled:opacity-50`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${doc.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {doc.is_published ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      <td className="px-4 py-3 font-bold text-[#0055b8]">
                        {doc.download_count ?? 0}
                      </td>

                      <td className="px-4 py-3">
                        {activeFile ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900 text-xs truncate max-w-[200px]" title={asset?.filename || 'File'}>
                              {asset?.original_filename || asset?.filename || 'Active Attachment'}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{formatBytes(asset?.size_bytes)}</span>
                              <span>&bull;</span>
                              <span className="uppercase font-mono">{activeFile.language_code || 'en'}</span>
                              {asset?.mime_type && (
                                <>
                                  <span>&bull;</span>
                                  <span>{asset.mime_type.split('/')[1] || asset.mime_type}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium italic">No file attached</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right space-x-2">
                        {canWrite && (
                          <>
                            {activeFile ? (
                              <button
                                onClick={() => handleOpenReplace(doc)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#0055b8] hover:bg-blue-50 rounded border border-blue-200 transition"
                              >
                                Replace File
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTargetDoc(doc);
                                  setIsUploadOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition"
                              >
                                Upload File
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(newPage) => fetchDocuments(newPage)}
        />
      </div>

      {/* Create Document Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Document</h3>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
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
                <label htmlFor="publishedCheck" className="text-sm text-slate-700 font-medium">Published</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50 transition"
                >
                  {createSubmitting ? 'Creating...' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Attachment Modal */}
      {isUploadOpen && targetDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Upload Attachment</h3>
            <p className="text-xs text-slate-500">
              Attach technical PDF or brochure to: <strong>{targetDoc.title}</strong>
            </p>

            <form onSubmit={handleUploadAttachment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Language Code</label>
                <select
                  value={uploadLang}
                  onChange={(e) => setUploadLang(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="en">English (en)</option>
                  <option value="fr">French (fr)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="de">German (de)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">File Asset</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#0055b8] hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setTargetDoc(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSubmitting || !uploadFile}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50 transition"
                >
                  {uploadSubmitting ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace File (New Version) Modal */}
      {isReplaceOpen && replaceDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Replace File (New Version)</h3>
            <p className="text-xs text-slate-500">
              Replacing active file version for: <strong>{replaceDoc.title}</strong>
            </p>

            {currentFileMeta && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Active Version</span>
                <div className="font-semibold text-slate-800 truncate">
                  {currentFileMeta.media_asset?.original_filename || currentFileMeta.media_asset?.filename || 'Existing attachment'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Size: {formatBytes(currentFileMeta.media_asset?.size_bytes)} &bull; Language: {currentFileMeta.language_code || 'en'}
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmReplace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Replacement File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setReplacementFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#0055b8] hover:file:bg-blue-100"
                />
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-lg text-[11px] text-[#0055b8]">
                Note: The new file will become the active download asset immediately. Previous version metadata remains retained in audit logs.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReplaceOpen(false);
                    setReplaceDoc(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replaceSubmitting || !replacementFile}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-sm font-bold disabled:opacity-50 transition"
                >
                  {replaceSubmitting ? 'Replacing...' : 'Upload Replacement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
