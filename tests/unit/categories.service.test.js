'use strict';

/**
 * categories.service unit tests.
 *
 * Mocks the categories repository and audit service to verify
 * hierarchy building, slugification, filtering, validation, and audit recording.
 */

jest.mock('../../src/modules/categories/categories.repository');
jest.mock('../../src/core/services/auditService');

const categoriesService = require('../../src/modules/categories/categories.service');
const repo = require('../../src/modules/categories/categories.repository');
const auditService = require('../../src/core/services/auditService');
const ApiError = require('../../src/core/utils/ApiError');

const ADMIN_ID = 'admin-cuid-999';

const MOCK_ROOT_CATEGORY = {
  id: 'cat-root-1',
  name: 'Construction',
  slug: 'construction',
  parent_id: null,
  description: 'Heavy construction tires and tracks',
  icon_url: 'https://cdn.example.com/icons/construction.png',
  banner_url: null,
  is_active: true,
  sort_order: 1,
  created_at: new Date('2026-10-13T10:00:00Z'),
  updated_at: new Date('2026-10-13T10:00:00Z'),
};

const MOCK_CHILD_CATEGORY = {
  id: 'cat-child-1',
  name: 'Excavator Tracks',
  slug: 'excavator-tracks',
  parent_id: 'cat-root-1',
  description: 'Rubber tracks for mini and heavy excavators',
  icon_url: null,
  banner_url: null,
  is_active: true,
  sort_order: 2,
  created_at: new Date('2026-10-13T10:05:00Z'),
  updated_at: new Date('2026-10-13T10:05:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  auditService.record.mockResolvedValue({});
});

describe('categoriesService.buildCategoryTree', () => {
  it('nests child categories under their parent and keeps roots at top level', () => {
    const flatList = [MOCK_ROOT_CATEGORY, MOCK_CHILD_CATEGORY];
    const tree = categoriesService.buildCategoryTree(flatList);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('cat-root-1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('cat-child-1');
  });

  it('handles multiple root categories correctly', () => {
    const root2 = { ...MOCK_ROOT_CATEGORY, id: 'cat-root-2', slug: 'agriculture', parent_id: null };
    const tree = categoriesService.buildCategoryTree([MOCK_ROOT_CATEGORY, root2]);

    expect(tree).toHaveLength(2);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });
});

describe('categoriesService.getPublicCategoryTree', () => {
  it('retrieves active categories and returns hierarchy tree', async () => {
    repo.findActiveCategories.mockResolvedValue([MOCK_ROOT_CATEGORY, MOCK_CHILD_CATEGORY]);

    const result = await categoriesService.getPublicCategoryTree();

    expect(repo.findActiveCategories).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('construction');
    expect(result[0].children[0].slug).toBe('excavator-tracks');
  });
});

describe('categoriesService.getPublicCategoryDetail', () => {
  it('retrieves category by id or slug with active children', async () => {
    const detail = { ...MOCK_ROOT_CATEGORY, children: [MOCK_CHILD_CATEGORY] };
    repo.findCategoryByIdOrSlug.mockResolvedValue(detail);

    const result = await categoriesService.getPublicCategoryDetail('construction');

    expect(repo.findCategoryByIdOrSlug).toHaveBeenCalledWith('construction', { activeOnly: true });
    expect(result.id).toBe('cat-root-1');
    expect(result.children).toHaveLength(1);
  });

  it('throws 404 Not Found when category does not exist or is inactive', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(null);

    await expect(categoriesService.getPublicCategoryDetail('unknown')).rejects.toThrow(ApiError);

    try {
      await categoriesService.getPublicCategoryDetail('unknown');
    } catch (err) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Category not found.');
    }
  });
});

describe('categoriesService.getCategoryProducts', () => {
  it('returns paginated products for an active category', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(MOCK_ROOT_CATEGORY);
    const mockProducts = [{ id: 'prod-1', name: 'Grip Master 500' }];
    repo.findCategoryProducts.mockResolvedValue({ total: 1, items: mockProducts });

    const result = await categoriesService.getCategoryProducts('cat-root-1', { page: 1, pageSize: 20 });

    expect(repo.findCategoryProducts).toHaveBeenCalledWith('cat-root-1', { page: 1, pageSize: 20 });
    expect(result.category.id).toBe('cat-root-1');
    expect(result.products).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('throws 404 when category does not exist', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(null);

    await expect(
      categoriesService.getCategoryProducts('cat-missing', { page: 1, pageSize: 20 })
    ).rejects.toThrow(ApiError);
  });
});

describe('categoriesService.getCategoryFilters', () => {
  it('groups distinct specification keys and values', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(MOCK_ROOT_CATEGORY);
    repo.findCategoryFilters.mockResolvedValue([
      { spec_key: 'Width', spec_value: '300mm' },
      { spec_key: 'Width', spec_value: '400mm' },
      { spec_key: 'Pattern', spec_value: 'Zig-Zag' },
    ]);

    const result = await categoriesService.getCategoryFilters('cat-root-1');

    expect(result.category_id).toBe('cat-root-1');
    expect(result.filters).toHaveLength(2);
    const widthFilter = result.filters.find((f) => f.key === 'Width');
    expect(widthFilter.values).toEqual(['300mm', '400mm']);
  });
});

describe('categoriesService.createCategory', () => {
  it('creates category with auto-generated slug and records audit log', async () => {
    repo.isSlugTaken.mockResolvedValue(false);
    repo.createCategory.mockImplementation(async (data) => ({
      id: 'cat-new-cuid',
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const result = await categoriesService.createCategory(ADMIN_ID, {
      name: 'Material Handling Equipment',
    });

    expect(repo.isSlugTaken).toHaveBeenCalledWith('material-handling-equipment');
    expect(repo.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Material Handling Equipment',
        slug: 'material-handling-equipment',
        is_active: true,
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN_ID,
        action: 'CREATE',
        entityType: 'CATEGORY',
        entityId: 'cat-new-cuid',
      })
    );
    expect(result.slug).toBe('material-handling-equipment');
  });

  it('rejects duplicate slug', async () => {
    repo.isSlugTaken.mockResolvedValue(true);

    await expect(
      categoriesService.createCategory(ADMIN_ID, {
        name: 'Construction',
        slug: 'construction',
      })
    ).rejects.toThrow(ApiError);

    expect(repo.createCategory).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('rejects invalid parent category', async () => {
    repo.isSlugTaken.mockResolvedValue(false);
    repo.findCategoryByIdOrSlug.mockResolvedValue(null);

    await expect(
      categoriesService.createCategory(ADMIN_ID, {
        name: 'Sub Excavator',
        parent_id: 'nonexistent-parent',
      })
    ).rejects.toThrow(ApiError);

    expect(repo.createCategory).not.toHaveBeenCalled();
  });
});

describe('categoriesService.updateCategory', () => {
  it('updates permitted fields and records audit diff', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(MOCK_ROOT_CATEGORY);
    const updatedRecord = { ...MOCK_ROOT_CATEGORY, name: 'Heavy Construction', is_active: false };
    repo.updateCategory.mockResolvedValue(updatedRecord);

    const result = await categoriesService.updateCategory(ADMIN_ID, 'cat-root-1', {
      name: 'Heavy Construction',
      is_active: false,
    });

    expect(repo.updateCategory).toHaveBeenCalledWith('cat-root-1', {
      name: 'Heavy Construction',
      is_active: false,
    });
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: ADMIN_ID,
      action: 'UPDATE',
      entityType: 'CATEGORY',
      entityId: 'cat-root-1',
      before: MOCK_ROOT_CATEGORY,
      after: updatedRecord,
    });
    expect(result.is_active).toBe(false);
  });

  it('rejects self-parenting relationship', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(MOCK_ROOT_CATEGORY);

    await expect(
      categoriesService.updateCategory(ADMIN_ID, 'cat-root-1', {
        parent_id: 'cat-root-1',
      })
    ).rejects.toThrow(ApiError);

    expect(repo.updateCategory).not.toHaveBeenCalled();
  });

  it('throws 404 when updating non-existent category', async () => {
    repo.findCategoryByIdOrSlug.mockResolvedValue(null);

    await expect(
      categoriesService.updateCategory(ADMIN_ID, 'nonexistent', { name: 'New Name' })
    ).rejects.toThrow(ApiError);
  });
});
