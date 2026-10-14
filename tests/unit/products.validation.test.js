'use strict';

/**
 * products.validation unit tests.
 *
 * Verifies Joi schemas for product listing, creation, updates, and image attachment.
 */

const {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  attachImageSchema,
  productIdParamSchema,
} = require('../../src/modules/products/products.validation');

describe('products.validation — listProductsQuerySchema', () => {
  it('allows standard query parameters and dynamic spec_ parameters', () => {
    const input = {
      category: 'industrial-tires',
      q: 'grip',
      page: 2,
      pageSize: 30,
      sort: 'name_asc',
      spec_width: '300mm',
      spec_ply_rating: '12PR',
    };
    const { error, value } = listProductsQuerySchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.category).toBe('industrial-tires');
    expect(value.spec_width).toBe('300mm');
    expect(value.spec_ply_rating).toBe('12PR');
  });

  it('fails with invalid sort option', () => {
    const { error } = listProductsQuerySchema.validate({ sort: 'unsupported_sort' });
    expect(error).toBeDefined();
  });
});

describe('products.validation — createProductSchema', () => {
  it('passes with all valid product and specification fields', () => {
    const input = {
      pid: 'CAMSO-400',
      category_id: 'cat-123',
      name: 'Excavator Master Track',
      description: 'Heavy duty excavator track',
      specifications: [
        {
          spec_type: 'SPECIFICATION',
          spec_key: 'Width',
          spec_value: '400mm',
          unit: 'mm',
          is_filterable: true,
          sort_order: 1,
        },
      ],
    };
    const { error, value } = createProductSchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.pid).toBe('CAMSO-400');
    expect(value.specifications).toHaveLength(1);
  });

  it('fails when PID or category_id or name is missing', () => {
    expect(createProductSchema.validate({ category_id: 'cat-1', name: 'Test' }).error).toBeDefined();
    expect(createProductSchema.validate({ pid: 'CAMSO-1', name: 'Test' }).error).toBeDefined();
    expect(createProductSchema.validate({ pid: 'CAMSO-1', category_id: 'cat-1' }).error).toBeDefined();
  });
});

describe('products.validation — updateProductSchema', () => {
  it('passes when at least one field is provided', () => {
    const { error, value } = updateProductSchema.validate({ is_active: false });
    expect(error).toBeUndefined();
    expect(value.is_active).toBe(false);
  });

  it('fails when empty object is passed', () => {
    expect(updateProductSchema.validate({}).error).toBeDefined();
  });
});

describe('products.validation — attachImageSchema', () => {
  it('passes with valid url and options', () => {
    const input = {
      url: 'https://cdn.example.com/tire.png',
      is_primary: true,
      sort_order: 1,
    };
    const { error, value } = attachImageSchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.is_primary).toBe(true);
  });

  it('fails when url is missing', () => {
    expect(attachImageSchema.validate({ is_primary: true }).error).toBeDefined();
  });
});

describe('products.validation — productIdParamSchema', () => {
  it('passes with id or idOrSlug parameter', () => {
    expect(productIdParamSchema.validate({ id: 'cuid-123' }).error).toBeUndefined();
    expect(productIdParamSchema.validate({ idOrSlug: 'camso-400' }).error).toBeUndefined();
  });

  it('fails when neither is provided', () => {
    expect(productIdParamSchema.validate({}).error).toBeDefined();
  });
});
