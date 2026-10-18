'use strict';

/**
 * 1. What this file does:
 *    Idempotent database seeder and dry-run preview tool for the 18 CAMSO test fixture documents.
 *    Reads artifacts/demo-documents/document_manifest.json and inserts/updates Document, DocumentFile,
 *    MediaAsset, and Translation records in a non-destructive manner.
 * 2. Overall design:
 *    Defaults to SAFE DRY-RUN mode. Requires explicit --execute flag and non-production NODE_ENV to write.
 *    Uses stable IDs (d001-d015, d_prod_*) to ensure repeated runs never produce duplicate records.
 *    Links product IDs by matching product_pid to existing Product records in the target database.
 * 3. Elements in the file:
 *    - dryRunPreview: Formats and prints tabular document summary and planned SQL operations.
 *    - executeSeed: Connects to non-production Prisma client and performs upserts.
 *    - main: Parses CLI arguments (--dry-run vs --execute), verifies safety invariants, and delegates.
 * 4. Final output of the file:
 *    Console summary of operations and database records in PostgreSQL.
 */

const fs = require('fs');
const path = require('path');

// Ensure .env is loaded
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const manifestPath = path.resolve(__dirname, '../artifacts/demo-documents/document_manifest.json');

/**
 * Validates environment safety invariants.
 */
function assertSafety(isExecuteMode) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (isExecuteMode) {
    if (nodeEnv === 'production') {
      console.error('[SEED ERROR] Refusing to seed documents in production environment.');
      process.exit(1);
    }

    const rawDbUrl = (process.env.DATABASE_URL || '').toLowerCase();
    if (rawDbUrl.includes('prod') || rawDbUrl.includes('live')) {
      console.error('[SEED ERROR] Refusing to seed documents: DATABASE_URL appears to reference production.');
      process.exit(1);
    }
  }
}

/**
 * Prints dry-run preview table without modifying any database.
 */
function dryRunPreview(manifest) {
  console.log('\n========================================================================================');
  console.log('CAMSO DEMO DOCUMENT SEEDER — DRY RUN PREVIEW (NO DATABASE CHANGES MADE)');
  console.log('========================================================================================');
  console.log(`Manifest loaded: ${manifest.length} document definitions\n`);

  console.log(
    'ID'.padEnd(12) +
    'ACCESS'.padEnd(14) +
    'TYPE'.padEnd(18) +
    'PRODUCT PID'.padEnd(22) +
    'TITLE'
  );
  console.log('-'.repeat(90));

  for (const doc of manifest) {
    console.log(
      doc.id.padEnd(12) +
      doc.access_level.padEnd(14) +
      doc.document_type.padEnd(18) +
      (doc.product_pid || '(None - General)').padEnd(22) +
      doc.title
    );
  }

  console.log('\nPlanned Operations per Document:');
  console.log('  1. Upsert MediaAsset (storage_path, filename, mime_type, size_bytes)');
  console.log('  2. Upsert Document (document_type, access_level, is_published = true, product_id)');
  console.log('  3. Upsert DocumentFile (document_id, language_code = "en", media_asset_id)');
  console.log('  4. Upsert Translation (entity_type = "DOCUMENT", field = "title", value = doc.title)');
  console.log('\nTo execute against your local database, run:');
  console.log('  node scripts/seed_demo_documents.js --execute\n');
}

/**
 * Idempotently seeds documents into the database.
 */
async function executeSeed(manifest) {
  assertSafety(true);

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ log: ['warn', 'error'] });

  console.log('\n========================================================================================');
  console.log('CAMSO DEMO DOCUMENT SEEDER — EXECUTING DATABASE SEED');
  console.log('========================================================================================');

  let createdCount = 0;
  let updatedCount = 0;

  try {
    for (const doc of manifest) {
      // Resolve product ID by PID if applicable
      let resolvedProductId = null;
      if (doc.product_pid) {
        const prod = await prisma.product.findUnique({
          where: { pid: doc.product_pid },
          select: { id: true },
        });
        if (prod) {
          resolvedProductId = prod.id;
        }
      }

      // 1. Upsert MediaAsset
      const mediaAssetId = `media-asset-${doc.id}`;
      await prisma.mediaAsset.upsert({
        where: { id: mediaAssetId },
        update: {
          url: doc.local_upload_path,
          filename: doc.filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
        },
        create: {
          id: mediaAssetId,
          url: doc.local_upload_path,
          filename: doc.filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
        },
      });

      // 2. Upsert Document
      const existingDoc = await prisma.document.findUnique({
        where: { id: doc.id },
      });

      const documentData = {
        document_type: doc.document_type,
        access_level: doc.access_level,
        is_published: true,
        product_id: resolvedProductId,
      };

      if (existingDoc) {
        await prisma.document.update({
          where: { id: doc.id },
          data: documentData,
        });
        updatedCount++;
      } else {
        await prisma.document.create({
          data: {
            id: doc.id,
            ...documentData,
          },
        });
        createdCount++;
      }

      // 3. Upsert DocumentFile
      const documentFileId = `doc-file-${doc.id}-en`;
      await prisma.documentFile.upsert({
        where: { id: documentFileId },
        update: {
          media_asset_id: mediaAssetId,
          is_offline_downloadable: true,
        },
        create: {
          id: documentFileId,
          document_id: doc.id,
          language_code: 'en',
          media_asset_id: mediaAssetId,
          is_offline_downloadable: true,
        },
      });

      // 4. Upsert Translation
      const translationKey = {
        entity_type_entity_id_field_language_code: {
          entity_type: 'DOCUMENT',
          entity_id: doc.id,
          field: 'title',
          language_code: 'en',
        },
      };

      await prisma.translation.upsert({
        where: translationKey,
        update: { value: doc.title },
        create: {
          entity_type: 'DOCUMENT',
          entity_id: doc.id,
          field: 'title',
          language_code: 'en',
          value: doc.title,
        },
      });
    }

    console.log(`\n[SEED COMPLETE] Processed ${manifest.length} documents.`);
    console.log(`[SEED COMPLETE] Created: ${createdCount}, Updated: ${updatedCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    console.error(`[SEED ERROR] Manifest not found at: ${manifestPath}`);
    console.error(`Please run: node scripts/generate_demo_documents.js first.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const isExecute = process.argv.includes('--execute');

  if (isExecute) {
    await executeSeed(manifest);
  } else {
    dryRunPreview(manifest);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[SEED ERROR] ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  dryRunPreview,
  executeSeed,
};
