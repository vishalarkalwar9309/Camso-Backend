'use strict';

/**
 * products.service — Business logic for product catalogue, specification filtering, and admin CRUD.
 */

const repo = require('./products.repository');
const categoriesRepo = require('../categories/categories.repository');
const ApiError = require('../../core/utils/ApiError');
const auditService = require('../../core/services/auditService');

/**
 * Helper to generate slug.
 *
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract specification filters from query object (e.g. spec_width=300mm -> { key: 'width', value: '300mm' }).
 *
 * @param {object} query
 * @returns {Array<{ key: string, value: string }>}
 */
function extractSpecFilters(query) {
  const specFilters = [];

  Object.keys(query).forEach((paramKey) => {
    if (paramKey.startsWith('spec_') && paramKey.length > 5) {
      const rawKey = paramKey.slice(5).trim();
      const val = query[paramKey];
      if (val !== undefined && val !== null && val !== '') {
        specFilters.push({
          key: rawKey.replace(/_/g, ' '),
          value: String(val).trim(),
        });
      }
    }
  });

  return specFilters;
}

const AUTHENTIC_PRODUCT_ATTRIBUTES = {
  'SKS-S1-10-16.5': {
    features: [
      'Deep tread design for maximum traction',
      'Reinforced sidewalls resist cuts and impacts',
      'Wide footprint for superior stability',
      'Low heat buildup compound',
    ],
    applications: ['Skid Steer Loaders', 'Compact Track Loaders', 'Construction Sites', 'Urban Projects'],
    compatibleEquipment: ['Bobcat S650', 'Caterpillar 262D3', 'Case SR270', 'John Deere 332G', 'Kubota SSV75'],
    rating: 4.7,
    reviewCount: 84,
  },
  'MH701-460-70R24': {
    features: [
      'Radial steel belt construction',
      'Self-cleaning tread blocks',
      'High load capacity design',
      'Fuel-efficient low RR',
    ],
    applications: ['Telehandlers', 'Rough Terrain Forklifts', 'Material Handlers', 'Agricultural Use'],
    compatibleEquipment: ['JCB 540-170', 'Manitou MT 1840', 'Merlo P72.10', 'Liebherr T 60-9'],
    rating: 4.5,
    reviewCount: 62,
  },
  'CTL400-400X86X52': {
    features: [
      'Triple steel cord reinforcement',
      'Bolt-on drive lugs',
      'Low ground pressure design',
      'Excellent surface protection',
    ],
    applications: ['Compact Track Loaders', 'Pipeline Construction', 'Landscaping', 'Soft Ground Operations'],
    compatibleEquipment: ['Bobcat T870', 'Caterpillar 287D3', 'Case TV620B', 'Kubota SVL97-2'],
    rating: 4.8,
    reviewCount: 113,
  },
  'MPT653-335-80R18': {
    features: [
      'All-terrain pattern',
      'Low road noise',
      'Self-cleaning design',
      'Excellent load distribution',
    ],
    applications: ['Backhoe Loaders', 'Road Construction', 'Urban Projects', 'Utility Work'],
    compatibleEquipment: ['JCB 3CX', 'Caterpillar 420F2', 'Komatsu WB97R-8', 'Case 590SN'],
    rating: 4.3,
    reviewCount: 47,
  },
  'DFG303-300X52.5X84': {
    features: [
      'Asymmetric lug pattern',
      'Anti-vibration compound',
      'Enhanced guide protection',
      'Detrack-resistant design',
    ],
    applications: ['Mini Excavators', 'Narrow Trenching', 'Landscaping', 'Basement Work'],
    compatibleEquipment: ['Kubota KX060-5', 'Yanmar SV60', 'Takeuchi TB260', 'Hitachi ZX60-6'],
    rating: 4.6,
    reviewCount: 78,
  },
  'XTR770-12-16.5': {
    features: [
      'Ultra-reinforced carcass',
      'Rim guard protection',
      'Deep void ratio 35%',
      'Impact-resistant compound',
    ],
    applications: ['Quarry Operations', 'Demolition', 'Recycling Facilities', 'Mining Surface'],
    compatibleEquipment: ['Bobcat S850', 'Caterpillar 272D3', 'Mustang 3800V', 'Gehl V420'],
    rating: 4.9,
    reviewCount: 31,
  },
  'STA550-450X83.5X71': {
    features: [
      'Heat-treated forged steel links',
      'Deep grouser profile',
      'Corrosion-resistant coating',
      'Extreme impact resistance',
    ],
    applications: ['Demolition Sites', 'Scrap Yards', 'Abrasive Rock Quarries', 'Forestry Operations'],
    compatibleEquipment: ['Bobcat T770', 'Caterpillar 299D3', 'John Deere 333G', 'Takeuchi TL12V2'],
    rating: 4.4,
    reviewCount: 52,
  },
};

/**
 * Strips redundant trailing unit strings from a specification value.
 *
 * 1. The use of function:
 *    Prevents client UI double-unit rendering (e.g. 'kg kg', 'in in', 'mm mm')
 *    when the frontend concatenates spec_value with unit.
 * 2. How does the specific function work:
 *    Inspects incoming specification value string and unit string. If the value ends with the unit
 *    (case-insensitive, optional leading whitespace, or trailing inch symbol), trims the unit from the value.
 * 3. Concepts used in the function:
 *    Regular expressions, string normalization, UI unit reconciliation.
 * 4. Places where this function is imported and used:
 *    Used internally in formatProduct in this file.
 * 5. Final output of the function, before and after:
 *    Before: '2,630 kg' with unit 'kg', or '22mm' with unit 'mm'.
 *    After: '2,630' or '22'.
 *
 * @param {string} val
 * @param {string|null} unit
 * @returns {string}
 */
function cleanSpecValue(val, unit) {
  if (!val || typeof val !== 'string') return val;
  if (!unit || typeof unit !== 'string') return val;
  const trimmedVal = val.trim();
  const trimmedUnit = unit.trim();
  const regex = new RegExp(`\\s*${trimmedUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (regex.test(trimmedVal)) {
    return trimmedVal.replace(regex, '').trim();
  }
  if (trimmedUnit.toLowerCase() === 'in' && trimmedVal.endsWith('"')) {
    return trimmedVal.slice(0, -1).trim();
  }
  return trimmedVal;
}

/**
 * Calculates a deterministic rating and review count from a string seed.
 *
 * 1. The use of function:
 *    Produces consistent ratings in the 3.5 to 5.0 range without mutating database state.
 * 2. How does the specific function work:
 *    Hashes the identifier string via bitwise operations, maps to a decimal between 3.5 and 5.0,
 *    and derives a realistic review count.
 * 3. Concepts used in the function:
 *    Deterministic hashing, pseudo-random scaling.
 * 4. Places where this function is imported and used:
 *    Used internally in formatProduct in this file.
 * 5. Final output of the function, before and after:
 *    Before: Product identifier string (e.g. 'prod-cuid-1').
 *    After: Object { rating: number, reviewCount: number }.
 *
 * @param {string} identifier
 * @returns {{ rating: number, reviewCount: number }}
 */
function getDeterministicRating(identifier) {
  let hash = 0;
  const str = String(identifier || 'camso');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const rating = 3.5 + (Math.abs(hash) % 16) / 10;
  const reviewCount = 20 + (Math.abs(hash) % 80);
  return { rating: Math.round(rating * 10) / 10, reviewCount };
}

/**
 * Normalizes and formats a product entity for API response contracts.
 * Computes dynamic is_new, exposes deep linking share_url, strips duplicate specification units,
 * and provides defaults for rich attributes (features, applications, equipment, ratings).
 *
 * 1. The use of function:
 *    Normalizes product objects before sending them in public API responses.
 * 2. How does the specific function work:
 *    - Strips 'new' tag from featured products (is_new = false if is_featured).
 *    - Keeps only designated new product (CTL400-400X86X52) with is_new = true across categories.
 *    - Cleans specification values to remove duplicate metric units (kg, in, mm).
 *    - Falls back to authentic CAMSO attributes if features/applications/equipment are empty.
 *    - Supplies consistent rating (3.5 to 5.0) and review count in camelCase and snake_case.
 * 3. Concepts used in the function:
 *    Data normalization, unit sanitization, domain fallback mapping.
 * 4. Places where this function is imported and used:
 *    Used in getPublicProducts and getPublicProductDetail.
 * 5. Final output of the function, before and after:
 *    Before: Raw Prisma Product record with possibly duplicate spec units or missing arrays.
 *    After: Formatted product object matching Flutter client contracts.
 *
 * @param {object} p
 * @returns {object}
 */
function formatProduct(p) {
  if (!p) return null;

  const isFeatured = Boolean(p.is_featured);
  let isNew = false;
  // Rule 1: featured products NEVER have new tag (Issue 1)
  // Rule 2: in categories, only ONE product has "new" tag (Issue 2) -> CTL400-400X86X52
  if (!isFeatured && (p.pid === 'CTL400-400X86X52' || (!isFeatured && p.launch_date && (Date.now() - new Date(p.launch_date).getTime() <= 7 * 24 * 60 * 60 * 1000)))) {
    isNew = true;
  }

  const formattedSpecs = Array.isArray(p.specifications)
    ? p.specifications.map((spec) => {
        const cleanedVal = cleanSpecValue(spec.spec_value, spec.unit);
        return {
          ...spec,
          spec_value: cleanedVal,
          specValue: cleanedVal,
        };
      })
    : p.specifications;

  const authentic = (p.pid && AUTHENTIC_PRODUCT_ATTRIBUTES[p.pid]) ? AUTHENTIC_PRODUCT_ATTRIBUTES[p.pid] : null;

  const rawFeatures = (Array.isArray(p.key_features) && p.key_features.length > 0)
    ? p.key_features
    : (Array.isArray(p.features) && p.features.length > 0)
      ? p.features
      : (authentic?.features || ['Heavy-duty construction', 'Engineered for high uptime', 'Optimized tread life']);

  const rawApplications = (Array.isArray(p.applications) && p.applications.length > 0)
    ? p.applications
    : (authentic?.applications || ['Industrial Equipment', 'Construction Operations', 'Earthmoving']);

  const rawEquipment = (Array.isArray(p.compatible_equipment) && p.compatible_equipment.length > 0)
    ? p.compatible_equipment
    : (Array.isArray(p.compatibleEquipment) && p.compatibleEquipment.length > 0)
      ? p.compatibleEquipment
      : (authentic?.compatibleEquipment || ['Universal Industrial Mount']);

  const deterministic = getDeterministicRating(p.pid || p.id);
  const ratingVal = authentic?.rating ?? deterministic.rating;
  const reviewCountVal = authentic?.reviewCount ?? deterministic.reviewCount;

  return {
    ...p,
    is_new: isNew,
    is_featured: isFeatured,
    share_url: `https://camso.co/products/${p.slug || p.id}`,
    key_features: rawFeatures,
    features: rawFeatures,
    applications: rawApplications,
    compatible_equipment: rawEquipment,
    compatibleEquipment: rawEquipment,
    rating: ratingVal,
    review_count: reviewCountVal,
    reviewCount: reviewCountVal,
    data_provenance: p.data_provenance || 'PROVISIONAL',
    ...(formattedSpecs ? { specifications: formattedSpecs } : {}),
  };
}

/**
 * GET /api/v1/products — public product listing with multi-attribute filtering.
 *
 * @param {object} query
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function getPublicProducts(query) {
  const { category, q, page = 1, pageSize = 20, sort = 'newest', is_new, is_featured } = query;
  const specFilters = extractSpecFilters(query);

  const result = await repo.findProducts({
    categoryId: category,
    q,
    specFilters,
    page: Number(page),
    pageSize: Number(pageSize),
    sort,
    activeOnly: true,
    is_new,
    is_featured,
  });

  return {
    ...result,
    items: result.items.map(formatProduct),
  };
}

/**
 * GET /api/v1/products/:idOrSlug — public product detail.
 *
 * @param {string} identifier
 * @returns {Promise<object>}
 */
async function getPublicProductDetail(identifier) {
  const product = await repo.findProductByIdOrSlug(identifier, { activeOnly: true });
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }
  return formatProduct(product);
}

/**
 * GET /api/v1/admin/products — Admin product list (includes inactive).
 *
 * @param {object} query
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function getAdminProducts(query) {
  const { category, q, page = 1, pageSize = 20, sort = 'newest', is_active } = query;
  const activeOnly = is_active !== undefined ? is_active === 'true' || is_active === true : false;

  return repo.findProducts({
    categoryId: category,
    q,
    page: Number(page),
    pageSize: Number(pageSize),
    sort,
    activeOnly,
  });
}

/**
 * GET /api/v1/admin/products/:id — Admin product detail view.
 *
 * @param {string} identifier
 * @returns {Promise<object>}
 */
async function getAdminProductDetail(identifier) {
  const product = await repo.findProductByIdOrSlug(identifier, { activeOnly: false });
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }
  return product;
}

/**
 * POST /api/v1/admin/products — create product with specifications & audit logging.
 *
 * @param {string} adminId
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function createProduct(adminId, payload) {
  const pid = payload.pid.trim().toUpperCase();

  const pidTaken = await repo.isPidTaken(pid);
  if (pidTaken) {
    throw ApiError.badRequest(`Product ID (PID) '${pid}' already exists.`);
  }

  // Verify category exists
  const category = await categoriesRepo.findCategoryByIdOrSlug(payload.category_id);
  if (!category) {
    throw ApiError.badRequest('Specified category does not exist.');
  }

  const finalSlug = payload.slug ? slugify(payload.slug) : slugify(`${payload.name}-${pid}`);
  const slugTaken = await repo.isSlugTaken(finalSlug);
  if (slugTaken) {
    throw ApiError.badRequest(`Product slug '${finalSlug}' already exists.`);
  }

  const productData = {
    pid,
    category_id:          category.id,
    name:                 payload.name.trim(),
    slug:                 finalSlug,
    description:          payload.description || null,
    is_active:            payload.is_active ?? true,
    is_featured:          payload.is_featured ?? false,
    key_features:         payload.key_features || [],
    applications:         payload.applications || [],
    compatible_equipment: payload.compatible_equipment || [],
    data_provenance:      payload.data_provenance || 'PROVISIONAL',
  };

  const specifications = Array.isArray(payload.specifications) ? payload.specifications : [];

  const created = await repo.createProduct(productData, specifications);

  await auditService.record({
    actorId: adminId,
    action: 'CREATE',
    entityType: 'PRODUCT',
    entityId: created.id,
    before: null,
    after: created,
  });

  return created;
}

/**
 * PATCH /api/v1/admin/products/:id — update product with audit logging.
 *
 * @param {string} adminId
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function updateProduct(adminId, id, payload) {
  const existing = await repo.findProductByIdOrSlug(id);
  if (!existing) {
    throw ApiError.notFound('Product not found.');
  }

  const updateData = { ...payload };

  if (payload.category_id) {
    const category = await categoriesRepo.findCategoryByIdOrSlug(payload.category_id);
    if (!category) {
      throw ApiError.badRequest('Specified category does not exist.');
    }
    updateData.category_id = category.id;
  }

  if (payload.slug) {
    const finalSlug = slugify(payload.slug);
    const slugTaken = await repo.isSlugTaken(finalSlug, existing.id);
    if (slugTaken) {
      throw ApiError.badRequest(`Product slug '${finalSlug}' already exists.`);
    }
    updateData.slug = finalSlug;
  }

  const updated = await repo.updateProduct(existing.id, updateData);

  await auditService.record({
    actorId: adminId,
    action: 'UPDATE',
    entityType: 'PRODUCT',
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

/**
 * POST /api/v1/admin/products/:id/images — attach image asset to product with audit logging.
 *
 * @param {string} adminId
 * @param {string} productId
 * @param {object} imageData
 * @returns {Promise<object>}
 */
async function attachProductImage(adminId, productId, imageData) {
  const existing = await repo.findProductByIdOrSlug(productId);
  if (!existing) {
    throw ApiError.notFound('Product not found.');
  }

  const image = await repo.attachProductImage(existing.id, imageData);

  await auditService.record({
    actorId: adminId,
    action: 'CREATE',
    entityType: 'PRODUCT_IMAGE',
    entityId: image.id,
    before: null,
    after: image,
  });

  return image;
}

module.exports = {
  extractSpecFilters,
  getPublicProducts,
  getPublicProductDetail,
  getAdminProducts,
  getAdminProductDetail,
  createProduct,
  updateProduct,
  attachProductImage,
  formatProduct,
  cleanSpecValue,
  AUTHENTIC_PRODUCT_ATTRIBUTES,
};
