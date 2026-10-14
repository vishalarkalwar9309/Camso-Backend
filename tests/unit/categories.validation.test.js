'use strict';

/**
 * categories.validation unit tests.
 *
 * Verifies Joi schemas for category creation, updates, and route parameters.
 */

const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categoryProductsQuerySchema,
} = require('../../src/modules/categories/categories.validation');

describe('categories.validation — createCategorySchema', () => {
  it('validates a valid create payload', () => {
    const input = {
      name: 'Agriculture Tracks',
      slug: 'agriculture-tracks',
      description: 'Tracks designed for agricultural machinery',
      sort_order: 1,
    };
    const { error, value } = createCategorySchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.name).toBe('Agriculture Tracks');
    expect(value.slug).toBe('agriculture-tracks');
  });

  it('fails when name is missing', () => {
    const { error } = createCategorySchema.validate({ slug: 'agriculture-tracks' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/"name" is required/);
  });

  it('normalizes uppercase slug to lowercase', () => {
    const { value } = createCategorySchema.validate({
      name: 'Forestry',
      slug: 'FORESTRY-TIRES',
    });
    expect(value.slug).toBe('forestry-tires');
  });
});

describe('categories.validation — updateCategorySchema', () => {
  it('passes when at least one field is provided', () => {
    const { error, value } = updateCategorySchema.validate({ is_active: false });
    expect(error).toBeUndefined();
    expect(value.is_active).toBe(false);
  });

  it('fails when an empty object is submitted', () => {
    const { error } = updateCategorySchema.validate({});
    expect(error).toBeDefined();
  });
});

describe('categories.validation — categoryIdParamSchema', () => {
  it('passes with non-empty id', () => {
    const { error, value } = categoryIdParamSchema.validate({ id: 'cat-cuid-123' });
    expect(error).toBeUndefined();
    expect(value.id).toBe('cat-cuid-123');
  });

  it('fails with missing id', () => {
    const { error } = categoryIdParamSchema.validate({});
    expect(error).toBeDefined();
  });
});

describe('categories.validation — categoryProductsQuerySchema', () => {
  it('supplies defaults for page, pageSize, and sort', () => {
    const { error, value } = categoryProductsQuerySchema.validate({});
    expect(error).toBeUndefined();
    expect(value.page).toBe(1);
    expect(value.pageSize).toBe(20);
    expect(value.sort).toBe('newest');
  });
});
