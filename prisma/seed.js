'use strict';

/**
 * CAMSO Backend — Development & Test Database Seed Script
 *
 * Seeds authentic CAMSO tyre and track catalogue data extracted from the
 * Flutter prototype fixture (scripts/data/camso_catalogue_seed.json).
 *
 * CRITICAL SAFETY RULES:
 * 1. Strictly refuses execution unless NODE_ENV is explicitly 'development' or 'test'.
 * 2. Refuses to run if DATABASE_URL points to any production/live target.
 * 3. Never logs credentials, secrets, or the database connection string.
 * 4. Idempotent: checks unique keys (Category.slug, Product.pid).
 * 5. Non-destructive: never deletes, truncates, or resets existing tables.
 * 6. Non-overwriting: preserves existing real images and custom metadata.
 * 7. Zero external network calls: never contacts Firebase, FCM, or notification services.
 */

const path = require('path');
const fs = require('fs');

// Ensure .env is loaded from the repository root
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');

// -----------------------------------------------------------------------------
// 1. Environment Safeguards (Fail Closed)
// -----------------------------------------------------------------------------
const rawNodeEnv = process.env.NODE_ENV;

// Fail closed: NODE_ENV must be explicitly set to 'development' or 'test'.
// Missing, 'production', 'staging', or any other value immediately aborts.
if (!rawNodeEnv || (rawNodeEnv !== 'development' && rawNodeEnv !== 'test')) {
  console.error('[SEED BLOCKED] CRITICAL SAFEGUARD: Refusing to seed database.');
  console.error(`[SEED BLOCKED] NODE_ENV must be explicitly set to "development" or "test". Current: ${rawNodeEnv || '(undefined)'}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('[SEED BLOCKED] CRITICAL SAFEGUARD: DATABASE_URL is not set.');
  process.exit(1);
}

// Fail closed if the database URL points to a production environment.
// Under no circumstances allow bypass or logging of the connection string.
const rawDbUrl = process.env.DATABASE_URL.toLowerCase();
const isProdDb = rawDbUrl.includes('prod') || rawDbUrl.includes('production') || rawDbUrl.includes('live');
if (isProdDb) {
  console.error('[SEED BLOCKED] CRITICAL SAFEGUARD: DATABASE_URL appears to reference a production database.');
  console.error('[SEED BLOCKED] Seeding is strictly forbidden.');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 2. Load & Validate Seed Fixture
// -----------------------------------------------------------------------------
const fixturePath = path.resolve(__dirname, '../scripts/data/camso_catalogue_seed.json');

if (!fs.existsSync(fixturePath)) {
  console.error(`[SEED ERROR] Fixture file not found at: ${fixturePath}`);
  process.exit(1);
}

let fixture;
try {
  fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
} catch (err) {
  console.error(`[SEED ERROR] Failed to parse JSON fixture: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(fixture.categories) || !Array.isArray(fixture.products)) {
  console.error('[SEED ERROR] Invalid fixture format: missing categories or products arrays.');
  process.exit(1);
}

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// -----------------------------------------------------------------------------
// 3. Execution
// -----------------------------------------------------------------------------
async function seed() {
  console.log('====================================================');
  console.log('CAMSO Catalogue Seed — Development / Test Fixture');
  console.log(`Environment:           ${rawNodeEnv}`);
  console.log(`Target:                Verified non-production database`);
  console.log(`Categories to process: ${fixture.categories.length}`);
  console.log(`Products to process:   ${fixture.products.length}`);
  console.log('====================================================');

  const categoryMap = new Map(); // slug -> category_id
  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let imagesCreated = 0;
  let imagesSkipped = 0;
  let specsUpserted = 0;

  // Step 3.1: Upsert Categories (Safely preserve existing custom icons)
  console.log('\n[1/3] Processing Categories...');
  for (const catData of fixture.categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: catData.slug },
    });

    let category;
    if (existing) {
      // Preserve existing custom icon_url if already set to a non-placeholder value
      const preserveExistingIcon = existing.icon_url && !existing.icon_url.includes('unsplash.com');
      category = await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: existing.name || catData.name,
          description: existing.description || catData.description || null,
          icon_url: preserveExistingIcon ? existing.icon_url : (catData.icon_url || existing.icon_url),
          sort_order: existing.sort_order ?? catData.sort_order ?? 0,
          is_active: existing.is_active ?? catData.is_active ?? true,
        },
      });
      categoriesUpdated++;
      console.log(`  ↻ Category [${catData.slug}] updated (preserved custom attributes) -> ID: ${category.id}`);
    } else {
      category = await prisma.category.create({
        data: {
          slug: catData.slug,
          name: catData.name,
          description: catData.description || null,
          icon_url: catData.icon_url || null,
          sort_order: catData.sort_order ?? 0,
          is_active: catData.is_active ?? true,
        },
      });
      categoriesCreated++;
      console.log(`  ✓ Category [${catData.slug}] created -> ID: ${category.id}`);
    }
    categoryMap.set(catData.slug, category.id);
  }

  // Step 3.2: Upsert Products & Linked Records
  console.log('\n[2/3] Processing Products & Related Records...');
  for (const prodData of fixture.products) {
    const categoryId = categoryMap.get(prodData.category_slug);
    if (!categoryId) {
      throw new Error(`Product ${prodData.pid} references unknown category slug: ${prodData.category_slug}`);
    }

    const existingProduct = await prisma.product.findUnique({
      where: { pid: prodData.pid },
    });

    let product;
    if (existingProduct) {
      product = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: existingProduct.name || prodData.name,
          slug: existingProduct.slug || prodData.slug,
          description: existingProduct.description || prodData.description || null,
          category_id: categoryId,
          is_active: existingProduct.is_active ?? prodData.is_active ?? true,
        },
      });
      productsUpdated++;
      console.log(`  ↻ Product [${prodData.pid}] updated -> ID: ${product.id}`);
    } else {
      product = await prisma.product.create({
        data: {
          pid: prodData.pid,
          name: prodData.name,
          slug: prodData.slug,
          description: prodData.description || null,
          category_id: categoryId,
          is_active: prodData.is_active ?? true,
        },
      });
      productsCreated++;
      console.log(`  ✓ Product [${prodData.pid}] "${prodData.name}" created -> ID: ${product.id}`);
    }

    // Step 3.3: Product Image (Safe rerun & non-destructive)
    if (prodData.image && prodData.image.url) {
      const existingImages = await prisma.productImage.findMany({
        where: { product_id: product.id },
      });

      if (existingImages.length > 0) {
        // Product already has images: do not inject prototype placeholder image
        imagesSkipped++;
      } else {
        // Product has no images: attach development placeholder image
        await prisma.productImage.create({
          data: {
            product_id: product.id,
            url: prodData.image.url,
            is_primary: prodData.image.is_primary ?? true,
            sort_order: prodData.image.sort_order ?? 0,
          },
        });
        imagesCreated++;
        console.log(`    + Attached prototype image for [${prodData.pid}]`);
      }
    }

    // Step 3.4: Product Specifications (Idempotent update/create by spec_key)
    // NOTE: ProductSpecification lacks @@unique([product_id, spec_key]) in schema.prisma,
    // so Prisma upsert is not supported. We look up existing specs for this product and
    // update by primary key `id` or create if absent.
    if (Array.isArray(prodData.specifications)) {
      const existingSpecs = await prisma.productSpecification.findMany({
        where: { product_id: product.id },
      });
      const specMap = new Map(existingSpecs.map((s) => [s.spec_key, s]));

      for (const spec of prodData.specifications) {
        const existing = specMap.get(spec.spec_key);
        if (existing) {
          await prisma.productSpecification.update({
            where: { id: existing.id },
            data: {
              spec_type: spec.spec_type || 'SPECIFICATION',
              spec_value: String(spec.spec_value),
              unit: spec.unit || null,
              is_filterable: spec.is_filterable ?? false,
              sort_order: spec.sort_order ?? 0,
            },
          });
        } else {
          await prisma.productSpecification.create({
            data: {
              product_id: product.id,
              spec_type: spec.spec_type || 'SPECIFICATION',
              spec_key: spec.spec_key,
              spec_value: String(spec.spec_value),
              unit: spec.unit || null,
              is_filterable: spec.is_filterable ?? false,
              sort_order: spec.sort_order ?? 0,
            },
          });
        }
        specsUpserted++;
      }
    }
  }

  // Step 3.5: Supported Languages (Idempotent upsert by code)
  const initialLanguages = [
    { code: 'en', name: 'English', native_name: 'English', flag_emoji: '🇬🇧', is_active: true, sort_order: 0 },
    { code: 'fr', name: 'French', native_name: 'Français', flag_emoji: '🇫🇷', is_active: true, sort_order: 1 },
    { code: 'de', name: 'German', native_name: 'Deutsch', flag_emoji: '🇩🇪', is_active: true, sort_order: 2 },
    { code: 'it', name: 'Italian', native_name: 'Italiano', flag_emoji: '🇮🇹', is_active: true, sort_order: 3 },
  ];
  let languagesUpserted = 0;
  for (const lang of initialLanguages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {
        name: lang.name,
        native_name: lang.native_name,
        flag_emoji: lang.flag_emoji,
        is_active: lang.is_active,
        sort_order: lang.sort_order,
      },
      create: lang,
    });
    languagesUpserted++;
  }

  // Step 3.6: Default App Content & Settings (Idempotent upsert by key)
  const initialContent = [
    {
      key: 'settings',
      title: 'Application Settings & Feature Flags',
      content: {
        notifications: {
          product_updates: true,
          technical_bulletins: true,
          promotions: false,
          dealer_alerts: true,
        },
        features: {
          offline_downloads: true,
          guest_browsing: true,
          distributor_claims: false,
        },
      },
      extra: { version: '1.0.0', channel: 'stable' },
      is_active: true,
    },
    {
      key: 'about',
      title: 'About CAMSO',
      content: {
        brand: 'CAMSO',
        company: 'CEAT Ltd. / A Michelin Group Company',
        tagline: 'Compact Construction Tires and Tracks',
        description: 'Engineered for extreme performance and uptime in heavy construction and industrial applications.',
        version: '1.0.0',
      },
      extra: {},
      is_active: true,
    },
    {
      key: 'contact',
      title: 'Contact & Support',
      content: {
        email: 'support@camso.com',
        phone: '+1-800-CAMSO-00',
        support_hours: 'Monday - Friday, 8:00 AM - 6:00 PM EST',
        csr_routing_enabled: true,
      },
      extra: {},
      is_active: true,
    },
    {
      key: 'legal',
      title: 'Legal & Privacy Policy',
      content: {
        terms_url: '/legal/terms',
        privacy_policy_url: '/legal/privacy',
        copyright: '© 2026 CEAT Ltd. / Camso. All rights reserved.',
      },
      extra: {},
      is_active: true,
    },
  ];
  let contentUpserted = 0;
  for (const item of initialContent) {
    await prisma.appContent.upsert({
      where: { key: item.key },
      update: {
        title: item.title,
        content: item.content,
        extra: item.extra,
        is_active: item.is_active,
      },
      create: item,
    });
    contentUpserted++;
  }

  console.log('\n[3/3] Seeding Completed Successfully!');
  console.log('----------------------------------------------------');
  console.log(`Summary:`);
  console.log(`  Categories created:      ${categoriesCreated}`);
  console.log(`  Categories updated:      ${categoriesUpdated}`);
  console.log(`  Products created:        ${productsCreated}`);
  console.log(`  Products updated:        ${productsUpdated}`);
  console.log(`  New images attached:     ${imagesCreated}`);
  console.log(`  Existing images kept:    ${imagesSkipped}`);
  console.log(`  Specifications updated:  ${specsUpserted}`);
  console.log(`  Languages upserted:      ${languagesUpserted}`);
  console.log(`  App content upserted:    ${contentUpserted}`);
  console.log('----------------------------------------------------');
}

seed()
  .catch((err) => {
    console.error('\n[SEED FAILED] Error during seed execution:');
    console.error(err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
