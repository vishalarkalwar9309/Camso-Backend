/**
 * admin-dashboard/src/pages/CatalogueManager.jsx
 *
 * 1. What this file does:
 *    Administrative product catalogue manager for CAMSO equipment tires and rubber tracks.
 *    Enables administrators to browse paginated products, filter by category and search terms,
 *    create new products, and edit existing product specifications and dimensional attributes.
 * 2. Overall design:
 *    Connects to /api/v1/admin/products and /api/v1/categories.
 *    Provides modal dialogs for product creation and modification with comprehensive
 *    dimension inputs (tire size, ply rating, length, width, height, unit options).
 *    Uses standardized Pagination component for multi-page datasets.
 * 3. Elements in the file:
 *    - CatalogueManager component.
 *    - Add/Edit Product modal dialog supporting specifications and dimensions.
 *    - Product inspection modal dialog.
 *    - Product cards grid with category filtering and keyword search.
 *    - 5-button Pagination control.
 * 4. Final output of the file:
 *    Exports default React component CatalogueManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const COMMON_UNITS = ['INCH', 'MM', 'KG', 'LBS', 'PSI', 'BAR', 'PR'];

/**
 * getProductCategoryName
 *
 * 1. The use of function:
 *    Normalizes category label from product object.
 * 2. How does the specific function work:
 *    Extracts name from object or string property safely.
 * 3. Concepts used in the function:
 *    Defensive property access.
 * 4. Places where this function is imported and used:
 *    Internal helper in CatalogueManager.
 * 5. Final output of the function, before and after:
 *    Returns formatted category string.
 */
function getProductCategoryName(p) {
  if (!p) return 'Tire & Track';
  if (typeof p.category === 'object' && p.category !== null) {
    return p.category.name || p.category.slug || 'Tire & Track';
  }
  return p.category || 'Tire & Track';
}

/**
 * getProductSpecsMap
 *
 * 1. The use of function:
 *    Extracts specifications array or object into a key-value dictionary.
 * 2. How does the specific function work:
 *    Reduces specifications array into key-value map with units attached.
 * 3. Concepts used in the function:
 *    Array reduce and null safety.
 * 4. Places where this function is imported and used:
 *    Internal helper in CatalogueManager.
 * 5. Final output of the function, before and after:
 *    Returns dictionary object of specs.
 */
function getProductSpecsMap(p) {
  if (!p) return {};
  if (p.specs && typeof p.specs === 'object') return p.specs;
  if (Array.isArray(p.specifications) && p.specifications.length > 0) {
    return p.specifications.reduce((acc, s) => {
      const key = s.spec_key || 'Specification';
      const val = s.unit ? `${s.spec_value} ${s.unit}` : s.spec_value;
      acc[key] = val;
      return acc;
    }, {});
  }
  return {};
}

/**
 * CatalogueManager
 *
 * 1. The use of function:
 *    Renders the catalogue and product management view in the CAMSO Admin Console.
 * 2. How does the specific function work:
 *    Queries GET /admin/products with category, search, and page params.
 *    Provides create and update forms submitting to POST/PATCH /admin/products.
 *    Supports specification and dimension editing with atomic database persistence.
 * 3. Concepts used in the function:
 *    Dynamic form fields, controlled inputs, server-side pagination, RBAC mutation guards.
 * 4. Places where this function is imported and used:
 *    Imported in admin-dashboard/src/App.jsx.
 * 5. Final output of the function, before and after:
 *    Before: Read-only catalogue explorer.
 *    After: Full CRUD product catalogue management console with dimension controls.
 *
 * @returns {React.ReactElement}
 */
export default function CatalogueManager() {
  const { canWrite } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');

  // Inspection Drawer
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Add / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    pid: '',
    name: '',
    category_id: '',
    description: '',
    tire_size: '',
    ply_rating: '',
    overall_diameter: '',
    section_width: '',
    unit: 'INCH',
    is_active: true,
  });
  const [customSpecs, setCustomSpecs] = useState([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Load Categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/categories');
        const raw = res.data || res;
        const list = Array.isArray(raw) ? raw : (raw?.items || raw?.categories || []);
        setCategories(list);
      } catch (err) {
        console.warn('Failed to load categories:', err.message);
      }
    }
    loadCategories();
  }, []);

  // Load Products
  const fetchProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: 12 };
      if (activeCategory) params.category = activeCategory;
      if (search.trim()) params.q = search.trim();

      const res = await api.get('/admin/products', params);
      const raw = res.data || res.items || res;
      const list = Array.isArray(raw) ? raw : (raw?.items || raw?.products || []);
      setProducts(list);
      if (res.meta?.pagination || res.pagination) {
        setPagination(res.meta?.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to query product catalogue.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      pid: '',
      name: '',
      category_id: categories[0]?.id || '',
      description: '',
      tire_size: '',
      ply_rating: '',
      overall_diameter: '',
      section_width: '',
      unit: 'INCH',
      is_active: true,
    });
    setCustomSpecs([]);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    const specsMap = getProductSpecsMap(p);
    const existingSpecs = Array.isArray(p.specifications) ? p.specifications : [];

    // Find known dimension keys
    const tireSize = specsMap['Tire Size'] || specsMap['Size'] || '';
    const plyRating = specsMap['Ply Rating'] || '';
    const diameter = specsMap['Overall Diameter'] || specsMap['Diameter'] || '';
    const width = specsMap['Section Width'] || specsMap['Width'] || '';

    // Filter custom specs not in standard dimension slots
    const standardKeys = ['Tire Size', 'Size', 'Ply Rating', 'Overall Diameter', 'Diameter', 'Section Width', 'Width'];
    const otherSpecs = existingSpecs
      .filter((s) => !standardKeys.includes(s.spec_key))
      .map((s) => ({
        key: s.spec_key,
        value: s.spec_value,
        unit: s.unit || '',
        type: s.spec_type || 'SPECIFICATION',
      }));

    setFormData({
      pid: p.pid || p.part_number || '',
      name: p.name || '',
      category_id: typeof p.category === 'object' && p.category !== null ? p.category.id : (p.category_id || categories[0]?.id || ''),
      description: p.description || '',
      tire_size: tireSize,
      ply_rating: plyRating,
      overall_diameter: diameter,
      section_width: width,
      unit: 'INCH',
      is_active: p.is_active !== undefined ? p.is_active : true,
    });
    setCustomSpecs(otherSpecs);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleAddCustomSpec = () => {
    setCustomSpecs([...customSpecs, { key: '', value: '', unit: '', type: 'DIMENSION' }]);
  };

  const handleRemoveCustomSpec = (idx) => {
    setCustomSpecs(customSpecs.filter((_, i) => i !== idx));
  };

  const handleCustomSpecChange = (idx, field, val) => {
    const updated = [...customSpecs];
    updated[idx][field] = val;
    setCustomSpecs(updated);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.pid.trim() || !formData.category_id) {
      setFormError('Product Name, Part Number / PID, and Category are required.');
      return;
    }

    // Compile specifications array
    const specifications = [];
    if (formData.tire_size.trim()) {
      specifications.push({
        spec_type: 'DIMENSION',
        spec_key: 'Tire Size',
        spec_value: formData.tire_size.trim(),
        unit: '',
        sort_order: 1,
      });
    }
    if (formData.ply_rating.trim()) {
      specifications.push({
        spec_type: 'SPECIFICATION',
        spec_key: 'Ply Rating',
        spec_value: formData.ply_rating.trim(),
        unit: 'PR',
        sort_order: 2,
      });
    }
    if (formData.overall_diameter.trim()) {
      specifications.push({
        spec_type: 'DIMENSION',
        spec_key: 'Overall Diameter',
        spec_value: formData.overall_diameter.trim(),
        unit: formData.unit,
        sort_order: 3,
      });
    }
    if (formData.section_width.trim()) {
      specifications.push({
        spec_type: 'DIMENSION',
        spec_key: 'Section Width',
        spec_value: formData.section_width.trim(),
        unit: formData.unit,
        sort_order: 4,
      });
    }

    // Append dynamic custom specifications
    customSpecs.forEach((s, idx) => {
      if (s.key.trim() && s.value.trim()) {
        specifications.push({
          spec_type: s.type || 'DIMENSION',
          spec_key: s.key.trim(),
          spec_value: s.value.trim(),
          unit: s.unit.trim() || null,
          sort_order: 10 + idx,
        });
      }
    });

    try {
      setFormSubmitting(true);
      if (editingProduct) {
        await api.patch(`/admin/products/${editingProduct.id}`, {
          name: formData.name.trim(),
          category_id: formData.category_id,
          description: formData.description.trim(),
          is_active: formData.is_active,
          specifications,
        });
      } else {
        await api.post('/admin/products', {
          pid: formData.pid.trim().toUpperCase(),
          name: formData.name.trim(),
          category_id: formData.category_id,
          description: formData.description.trim(),
          is_active: formData.is_active,
          specifications,
        });
      }

      setIsFormOpen(false);
      fetchProducts(pagination.page);
    } catch (err) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (p, e) => {
    e.stopPropagation();
    try {
      const nextActive = !p.is_active;
      await api.patch(`/admin/products/${p.id}`, { is_active: nextActive });
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: nextActive } : item))
      );
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Catalogue & Product Specifications</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">
            Heavy equipment tires, rubber tracks, ply ratings, dimensions, and engineering data
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
            Add Product
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              activeCategory === ''
                ? 'bg-[#0055b8] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const catLabel = cat.name || cat.code || cat.slug || 'Category';
            const catId = cat.id || cat.code || catLabel;
            const isSelected = activeCategory === catLabel || activeCategory === catId;
            return (
              <button
                key={catId}
                onClick={() => setActiveCategory(catLabel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-[#0055b8] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {catLabel}
              </button>
            );
          })}
        </div>

        <div>
          <input
            type="text"
            placeholder="Search by product name, PID, or engineering description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-[#0055b8] border-t-transparent rounded-full mb-2"></div>
          <p>Querying catalogue database...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-500 text-sm bg-white rounded-xl border border-slate-200">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No products found matching the criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => {
              const specs = getProductSpecsMap(p);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0055b8] hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0055b8] uppercase tracking-wide">
                        {getProductCategoryName(p)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-400">
                          {p.pid || p.part_number || 'N/A'}
                        </span>
                        <button
                          onClick={(e) => handleToggleActive(p, e)}
                          title="Toggle Active Status"
                          className={`w-2.5 h-2.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{p.description || 'No description provided.'}</p>
                  </div>

                  <div>
                    {specs && Object.keys(specs).length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                        {Object.entries(specs).slice(0, 2).map(([key, val]) => (
                          <div key={key} className="bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">{key}</span>
                            <span className="font-bold text-slate-800">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {canWrite && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(p);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-[#0055b8] hover:bg-blue-50 rounded border border-blue-200 transition"
                        >
                          Edit Specifications
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={(newPage) => fetchProducts(newPage)}
          />
        </div>
      )}

      {/* Product Spec Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#0055b8] uppercase tracking-wide">
                  {getProductCategoryName(selectedProduct)}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 font-mono font-medium">Part #{selectedProduct.pid || selectedProduct.part_number || 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{selectedProduct.description || 'No description provided.'}</p>

            {(() => {
              const specs = getProductSpecsMap(selectedProduct);
              if (!specs || Object.keys(specs).length === 0) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Engineering Specifications & Dimensions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(specs).map(([k, v]) => (
                      <div key={k} className="p-2.5 bg-blue-50/40 rounded-lg border border-blue-100 text-xs">
                        <div className="text-slate-400 font-bold uppercase text-[10px]">{k}</div>
                        <div className="font-bold text-slate-800">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-between items-center">
              {canWrite && (
                <button
                  onClick={() => {
                    const target = selectedProduct;
                    setSelectedProduct(null);
                    handleOpenEdit(target);
                  }}
                  className="px-3 py-1.5 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold"
                >
                  Edit Product
                </button>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product to Catalogue'}
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Camso SKS 753"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Part Number / PID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.pid}
                    onChange={(e) => setFormData({ ...formData, pid: e.target.value })}
                    placeholder="e.g. CW-753-12165"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none uppercase font-mono disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0055b8] outline-none"
                >
                  <option value="">Select a Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.code || c.slug}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Engineering application and performance summary..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
                />
              </div>

              {/* Dimensions Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dimensions & Core Specs</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>Units:</span>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs font-bold"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tire Size</label>
                    <input
                      type="text"
                      value={formData.tire_size}
                      onChange={(e) => setFormData({ ...formData, tire_size: e.target.value })}
                      placeholder="e.g. 12-16.5"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Ply Rating</label>
                    <input
                      type="text"
                      value={formData.ply_rating}
                      onChange={(e) => setFormData({ ...formData, ply_rating: e.target.value })}
                      placeholder="e.g. 12"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Overall Diameter</label>
                    <input
                      type="text"
                      value={formData.overall_diameter}
                      onChange={(e) => setFormData({ ...formData, overall_diameter: e.target.value })}
                      placeholder={`in ${formData.unit}`}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Section Width</label>
                    <input
                      type="text"
                      value={formData.section_width}
                      onChange={(e) => setFormData({ ...formData, section_width: e.target.value })}
                      placeholder={`in ${formData.unit}`}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Additional Dynamic Specs */}
                {customSpecs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Additional Specifications</span>
                    {customSpecs.map((spec, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Spec Name (e.g. Tread Depth)"
                          value={spec.key}
                          onChange={(e) => handleCustomSpecChange(idx, 'key', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 25/32)"
                          value={spec.value}
                          onChange={(e) => handleCustomSpecChange(idx, 'value', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Unit (optional)"
                          value={spec.unit}
                          onChange={(e) => handleCustomSpecChange(idx, 'unit', e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSpec(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddCustomSpec}
                  className="text-xs font-bold text-[#0055b8] hover:underline"
                >
                  + Add Custom Specification Row
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prodActiveCheck"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#0055b8] rounded"
                />
                <label htmlFor="prodActiveCheck" className="text-xs font-semibold text-slate-700">
                  Active (visible in mobile app catalogue)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-[#0055b8] hover:bg-[#004394] text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
                >
                  {formSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
