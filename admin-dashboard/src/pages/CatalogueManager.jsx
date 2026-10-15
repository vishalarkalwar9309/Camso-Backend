/**
 * admin-dashboard/src/pages/CatalogueManager.jsx
 *
 * WHAT THIS FILE DOES:
 *   Provides the administrative viewer and explorer for CAMSO Products and Categories
 *   in the official Blue & White corporate theme. Enables administrators to inspect tire and
 *   rubber track product lines, view technical engineering specifications, filter by category,
 *   and search by keywords.
 *
 * OVERALL DESIGN:
 *   React functional component utilizing hooks (useState, useEffect).
 *   Queries public/catalogue REST endpoints:
 *     - GET /api/v1/categories
 *     - GET /api/v1/products
 *   With graceful fallback sample catalogue models if the backend catalogue module is offline.
 *   Styled with crisp white cards, Camso Blue pills, and spec inspection dialogs.
 *
 * ELEMENTS IN THIS FILE:
 *   - CatalogueManager component
 *     - Query state: categories, products, activeCategory, search, loading, selectedProduct
 *     - Event handlers: fetchCatalogue, handleSelectCategory, handleSelectProduct
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exports the default React component CatalogueManager for tab rendering in App.jsx.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const SAMPLE_CATEGORIES = [
  { id: 'cat-skid-steer', name: 'Skid Steer Tires', code: 'SKID_STEER', count: 12 },
  { id: 'cat-mini-excavator', name: 'Mini Excavator Tracks', code: 'MINI_EXCAVATOR', count: 8 },
  { id: 'cat-wheel-loader', name: 'Wheel Loader Tires', code: 'WHEEL_LOADER', count: 6 },
  { id: 'cat-forklift-solids', name: 'Forklift Solid Tires', code: 'FORKLIFT_SOLIDS', count: 15 },
];

const SAMPLE_PRODUCTS = [
  {
    id: 'prod-sks-753',
    name: 'Camso SKS 753',
    category: 'Skid Steer Tires',
    part_number: 'CW-753-12165',
    description: 'Heavy-duty non-directional tire designed for mixed-surface off-road skid steer loaders.',
    specs: { 'Ply Rating': '12PR', 'Tire Size': '12-16.5', 'Tread Depth': '25/32 in', 'Pattern': 'Non-directional' },
  },
  {
    id: 'prod-mex-hxd',
    name: 'Camso HXD Mini Excavator Track',
    category: 'Mini Excavator Tracks',
    part_number: 'TK-HXD-300525',
    description: 'Engineered with internal continuous steel cords for ultimate puncture and cut resistance.',
    specs: { 'Width': '300 mm', 'Pitch': '52.5 mm', 'Links': '84', 'Carcass': 'Endless steel cable' },
  },
  {
    id: 'prod-sol-pos',
    name: 'Camso Solideal PON 550',
    category: 'Forklift Solid Tires',
    part_number: 'SL-550-28915',
    description: 'Resilient solid press-on tire for extreme operating hours in intensive warehousing operations.',
    specs: { 'Size': '28x9-15', 'Type': 'Press-on solid', 'Compound': 'Low rolling resistance', 'Max Load': '3,500 kg' },
  },
];

/**
 * CatalogueManager
 *
 * USE OF FUNCTION:
 *   Main React view component for exploring product catalogue and specs in Blue/White theme.
 *
 * HOW DOES THE SPECIFIC FUNCTION WORK:
 *   1. Fetches categories and products from backend catalogue endpoints.
 *   2. If backend catalogue is unmerged or offline, falls back to rich sample catalogue models.
 *   3. Filters products by category and live keyword search.
 *   4. Enables clicking a product card to view detailed specifications in an inspection modal.
 *
 * CONCEPTS USED IN THE FUNCTION:
 *   - React state management and computed array filtering.
 *   - Graceful fallback resilience for decoupled service architectures.
 *   - Tailwind CSS Blue/White product cards and spec modals.
 *
 * PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
 *   Imported by admin-dashboard/src/App.jsx.
 *
 * FINAL OUTPUT OF THE FUNCTION:
 *   Before: Previous red-accented view.
 *   After: Branded Blue & White product catalogue explorer.
 */
function getProductCategoryName(p) {
  if (!p) return 'Tire & Track';
  if (typeof p.category === 'object' && p.category !== null) {
    return p.category.name || p.category.slug || 'Tire & Track';
  }
  return p.category || 'Tire & Track';
}

function getProductSpecs(p) {
  if (!p) return null;
  if (p.specs && typeof p.specs === 'object') return p.specs;
  if (Array.isArray(p.specifications) && p.specifications.length > 0) {
    return p.specifications.reduce((acc, s) => {
      const key = s.spec_key || 'Specification';
      const val = s.unit ? `${s.spec_value} ${s.unit}` : s.spec_value;
      acc[key] = val;
      return acc;
    }, {});
  }
  return null;
}

export default function CatalogueManager() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    async function loadCatalogue() {
      try {
        setLoading(true);
        // Try fetching from backend endpoints
        const [catRes, prodRes] = await Promise.allSettled([
          api.get('/categories'),
          api.get('/products'),
        ]);

        if (catRes.status === 'fulfilled' && catRes.value) {
          const rawCats = catRes.value.data || catRes.value;
          const catList = Array.isArray(rawCats) ? rawCats : (rawCats?.items || rawCats?.categories || []);
          if (catList.length > 0) {
            setCategories(catList);
          } else {
            setCategories(SAMPLE_CATEGORIES);
          }
        } else {
          setCategories(SAMPLE_CATEGORIES);
        }

        if (prodRes.status === 'fulfilled' && prodRes.value) {
          const rawProds = prodRes.value.data || prodRes.value;
          const prodList = Array.isArray(rawProds) ? rawProds : (rawProds?.items || rawProds?.products || []);
          if (prodList.length > 0) {
            setProducts(prodList);
          } else {
            setProducts(SAMPLE_PRODUCTS);
          }
        } else {
          setProducts(SAMPLE_PRODUCTS);
        }
      } catch (err) {
        setCategories(SAMPLE_CATEGORIES);
        setProducts(SAMPLE_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }
    loadCatalogue();
  }, []);

  const filteredProducts = products.filter((p) => {
    const catName = getProductCategoryName(p);
    const catId = typeof p.category === 'object' && p.category !== null ? p.category.id : p.category_id;
    const matchesCategory = !activeCategory ||
      catName === activeCategory ||
      catId === activeCategory ||
      (typeof p.category === 'string' && p.category === activeCategory);

    const partNum = p.pid || p.part_number || '';
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      partNum.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Catalogue & Products</h2>
          <p className="text-sm text-slate-500 font-normal mt-0.5">Explore heavy equipment tire lines, rubber tracks, and engineering specifications</p>
        </div>
      </div>

      {/* Category Pills & Search */}
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
            All Categories ({products.length})
          </button>
          {categories.map((cat) => {
            const catLabel = cat.name || cat.code || cat.slug || 'Category';
            const catKey = cat.id || cat.code || catLabel;
            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catLabel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  activeCategory === catLabel
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
            placeholder="Search by product name, part number, or tread type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0055b8] outline-none"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
          Loading product catalogue...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No products found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => (
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
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    {p.pid || p.part_number || 'N/A'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{p.description}</p>
              </div>

              {(() => {
                const specs = getProductSpecs(p);
                if (!specs || Object.keys(specs).length === 0) return null;
                return (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(specs).slice(0, 2).map(([key, val]) => (
                      <div key={key} className="bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">{key}</span>
                        <span className="font-bold text-slate-800">{val}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Product Spec Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
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

            <p className="text-sm text-slate-600 leading-relaxed">{selectedProduct.description}</p>

            {(() => {
              const specs = getProductSpecs(selectedProduct);
              if (!specs || Object.keys(specs).length === 0) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Technical Specifications</h4>
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

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
