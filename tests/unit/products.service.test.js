'use strict';

/**
 * products.service unit tests.
 *
 * Mocks products repository, categories repository, and audit service
 * to test specification filtering, slugification, validation, and audit recording.
 */

jest.mock('../../src/modules/products/products.repository');
jest.mock('../../src/modules/categories/categories.repository');
jest.mock('../../src/core/services/auditService');

const productsService = require('../../src/modules/products/products.service');
const repo = require('../../src/modules/products/products.repository');
const categoriesRepo = require('../../src/modules/categories/categories.repository');
const auditService = require('../../src/core/services/auditService');
const ApiError = require('../../src/core/utils/ApiError');

const ADMIN_ID = 'admin-cuid-001';

const MOCK_CATEGORY = {
  id: 'cat-cuid-1',
  name: 'Industrial Tires',
  slug: 'industrial-tires',
  is_active: true,
};

const MOCK_PRODUCT = {
  id: 'prod-cuid-1',
  pid: 'CAMSO-400',
  category_id: 'cat-cuid-1',
  name: 'Grip Master 500',
  slug: 'grip-master-500-camso-400',
  description: 'Heavy duty industrial tire',
  is_active: true,
  created_at: new Date('2026-10-13T10:00:00Z'),
  updated_at: new Date('2026-10-13T10:00:00Z'),
  category: MOCK_CATEGORY,
  images: [],
  specifications: [
    { id: 'spec-1', spec_type: 'SPECIFICATION', spec_key: 'Width', spec_value: '300mm', is_filterable: true },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  auditService.record.mockResolvedValue({});
});

describe('productsService.extractSpecFilters', () => {
  it('extracts query keys prefixed with spec_ into key-value filter pairs', () => {
    const query = {
      category: 'industrial-tires',
      page: '1',
      spec_width: '300mm',
      spec_ply_rating: '12PR',
      spec_: 'ignored',
    };

    const filters = productsService.extractSpecFilters(query);

    expect(filters).toHaveLength(2);
    expect(filters).toEqual([
      { key: 'width', value: '300mm' },
      { key: 'ply rating', value: '12PR' },
    ]);
  });
});

describe('productsService.getPublicProducts', () => {
  it('passes parsed parameters and spec filters to repository', async () => {
    repo.findProducts.mockResolvedValue({ total: 1, items: [MOCK_PRODUCT] });

    const result = await productsService.getPublicProducts({
      category: 'industrial-tires',
      q: 'Grip',
      spec_width: '300mm',
      page: '1',
      pageSize: '10',
      sort: 'name_asc',
    });

    expect(repo.findProducts).toHaveBeenCalledWith({
      categoryId: 'industrial-tires',
      q: 'Grip',
      specFilters: [{ key: 'width', value: '300mm' }],
      page: 1,
      pageSize: 10,
      sort: 'name_asc',
      activeOnly: true,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe('productsService.getPublicProductDetail', () => {
  it('returns product when found and active', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(MOCK_PRODUCT);

    const result = await productsService.getPublicProductDetail('CAMSO-400');

    expect(repo.findProductByIdOrSlug).toHaveBeenCalledWith('CAMSO-400', { activeOnly: true });
    expect(result.pid).toBe('CAMSO-400');
  });

  it('throws 404 when product not found', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(null);

    await expect(productsService.getPublicProductDetail('missing')).rejects.toThrow(ApiError);

    try {
      await productsService.getPublicProductDetail('missing');
    } catch (err) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Product not found.');
    }
  });
});

describe('productsService.createProduct', () => {
  it('creates product and specifications with uppercase PID and records audit log', async () => {
    repo.isPidTaken.mockResolvedValue(false);
    categoriesRepo.findCategoryByIdOrSlug.mockResolvedValue(MOCK_CATEGORY);
    repo.isSlugTaken.mockResolvedValue(false);
    repo.createProduct.mockImplementation(async (data, specs) => ({
      id: 'prod-new-cuid',
      ...data,
      specifications: specs,
    }));

    const payload = {
      pid: 'camso-900', // lowercase to verify uppercase normalization
      category_id: 'cat-cuid-1',
      name: 'Solid Grip 900',
      description: 'Solid tire for extreme wear',
      specifications: [
        { spec_type: 'SPECIFICATION', spec_key: 'Rim Size', spec_value: '15 inch', is_filterable: true },
      ],
    };

    const result = await productsService.createProduct(ADMIN_ID, payload);

    expect(result.pid).toBe('CAMSO-900');
    expect(repo.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        pid: 'CAMSO-900',
        name: 'Solid Grip 900',
        category_id: 'cat-cuid-1',
      }),
      payload.specifications
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN_ID,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: 'prod-new-cuid',
      })
    );
  });

  it('rejects duplicate PID with 400 Bad Request', async () => {
    repo.isPidTaken.mockResolvedValue(true);

    await expect(
      productsService.createProduct(ADMIN_ID, {
        pid: 'CAMSO-400',
        category_id: 'cat-cuid-1',
        name: 'Duplicate PID Product',
      })
    ).rejects.toThrow(ApiError);

    expect(repo.createProduct).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('rejects invalid category with 400 Bad Request', async () => {
    repo.isPidTaken.mockResolvedValue(false);
    categoriesRepo.findCategoryByIdOrSlug.mockResolvedValue(null);

    await expect(
      productsService.createProduct(ADMIN_ID, {
        pid: 'CAMSO-999',
        category_id: 'nonexistent-cat',
        name: 'Product with Bad Category',
      })
    ).rejects.toThrow(ApiError);

    expect(repo.createProduct).not.toHaveBeenCalled();
  });
});

describe('productsService.updateProduct', () => {
  it('updates permitted fields and records audit diff', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(MOCK_PRODUCT);
    const updatedProduct = { ...MOCK_PRODUCT, name: 'Grip Master 500 V2', is_active: false };
    repo.updateProduct.mockResolvedValue(updatedProduct);

    const result = await productsService.updateProduct(ADMIN_ID, 'prod-cuid-1', {
      name: 'Grip Master 500 V2',
      is_active: false,
    });

    expect(repo.updateProduct).toHaveBeenCalledWith('prod-cuid-1', {
      name: 'Grip Master 500 V2',
      is_active: false,
    });
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: ADMIN_ID,
      action: 'UPDATE',
      entityType: 'PRODUCT',
      entityId: 'prod-cuid-1',
      before: MOCK_PRODUCT,
      after: updatedProduct,
    });
    expect(result.is_active).toBe(false);
  });

  it('passes specifications including dimensions to repository when provided', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(MOCK_PRODUCT);
    const newSpecs = [
      { spec_type: 'DIMENSION', spec_key: 'Width', spec_value: '300', unit: 'mm' },
      { spec_type: 'DIMENSION', spec_key: 'Ply Rating', spec_value: '12PR', unit: null },
    ];
    const updatedProduct = { ...MOCK_PRODUCT, specifications: newSpecs };
    repo.updateProduct.mockResolvedValue(updatedProduct);

    const result = await productsService.updateProduct(ADMIN_ID, 'prod-cuid-1', {
      name: 'Grip Master 500 V2',
      specifications: newSpecs,
    });

    expect(repo.updateProduct).toHaveBeenCalledWith(
      'prod-cuid-1',
      { name: 'Grip Master 500 V2' },
      newSpecs
    );
    expect(result.specifications).toHaveLength(2);
  });

  it('throws 404 when updating non-existent product', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(null);

    await expect(
      productsService.updateProduct(ADMIN_ID, 'missing-id', { is_active: false })
    ).rejects.toThrow(ApiError);
  });
});

describe('productsService.attachProductImage', () => {
  it('attaches image to product and records audit log', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(MOCK_PRODUCT);
    const mockImage = {
      id: 'img-cuid-1',
      product_id: 'prod-cuid-1',
      url: 'https://cdn.example.com/products/camso-400-front.png',
      is_primary: true,
      sort_order: 1,
    };
    repo.attachProductImage.mockResolvedValue(mockImage);

    const result = await productsService.attachProductImage(ADMIN_ID, 'prod-cuid-1', {
      url: 'https://cdn.example.com/products/camso-400-front.png',
      is_primary: true,
      sort_order: 1,
    });

    expect(repo.attachProductImage).toHaveBeenCalledWith('prod-cuid-1', {
      url: 'https://cdn.example.com/products/camso-400-front.png',
      is_primary: true,
      sort_order: 1,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN_ID,
        action: 'CREATE',
        entityType: 'PRODUCT_IMAGE',
        entityId: 'img-cuid-1',
      })
    );
    expect(result.id).toBe('img-cuid-1');
  });

  it('throws 404 when product does not exist', async () => {
    repo.findProductByIdOrSlug.mockResolvedValue(null);

    await expect(
      productsService.attachProductImage(ADMIN_ID, 'missing-prod', { url: 'https://test.com/img.png' })
    ).rejects.toThrow(ApiError);
  });
});
