'use strict';

/**
 * business.routes — Protected portal endpoints enforcing role & organization data isolation.
 *
 * Rules:
 *   - /api/v1/business/organization       -> Dealer & Distributor (scoped to caller's org)
 *   - /api/v1/business/dealer/portal      -> Dealer ONLY (403 for Distributor)
 *   - /api/v1/business/distributor/portal -> Distributor ONLY (403 for Dealer)
 */

const { Router } = require('express');
const businessGuard = require('../../core/middleware/businessGuard');
const requireBusinessRole = require('../../core/middleware/requireBusinessRole');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const prisma = require('../../config/database');
const ApiError = require('../../core/utils/ApiError');

const router = Router();

// Enforce business authentication across all /business routes
router.use(businessGuard);

/**
 * GET /api/v1/business/organization
 * Data isolation: strictly returns the caller's organization.
 */
router.get('/organization', async (req, res, next) => {
  try {
    const org = await prisma.businessOrganization.findUnique({
      where: { id: req.businessUser.organization_id },
      include: {
        members: {
          select: {
            id: true,
            email: true,
            display_name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!org) {
      throw ApiError.notFound('Organization not found.');
    }

    sendSuccess(res, org, 200);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/business/dealer/portal
 * Restricted to DEALER persona only.
 */
router.get('/dealer/portal', requireBusinessRole('DEALER'), async (req, res) => {
  sendSuccess(res, {
    portal: 'DEALER_PORTAL',
    message: 'Welcome to the Authorized Dealer Portal.',
    organization_id: req.businessUser.organization_id,
    authorized_features: [
      'product_catalog_ordering',
      'warranty_registration',
      'dealer_promotions',
      'customer_support_direct',
    ],
  }, 200);
});

/**
 * GET /api/v1/business/distributor/portal
 * Restricted to DISTRIBUTOR persona only.
 */
router.get('/distributor/portal', requireBusinessRole('DISTRIBUTOR'), async (req, res) => {
  sendSuccess(res, {
    portal: 'DISTRIBUTOR_PORTAL',
    message: 'Welcome to the Regional Distributor Portal.',
    organization_id: req.businessUser.organization_id,
    authorized_features: [
      'dealer_network_allocation',
      'bulk_inventory_dispatch',
      'regional_quotas',
      'credit_line_management',
    ],
  }, 200);
});

/**
 * GET /api/v1/business/oem/portal
 * Restricted to OEM_PARTNER persona only.
 */
router.get('/oem/portal', requireBusinessRole('OEM_PARTNER'), async (req, res) => {
  sendSuccess(res, {
    portal: 'OEM_PARTNER_PORTAL',
    message: 'Welcome to the OEM Engineering & Technical Portal.',
    organization_id: req.businessUser.organization_id,
    authorized_features: [
      'technical_specifications',
      'cad_drawings_access',
      'engineering_enquiries',
      'co_development_projects',
    ],
  }, 200);
});

/**
 * GET /api/v1/business/oem/documents
 * Restricted to OEM_PARTNER persona only.
 * Returns approved technical documents for OEM integration partners.
 */
router.get('/oem/documents', requireBusinessRole('OEM_PARTNER'), async (req, res, next) => {
  try {
    const rawDocuments = await prisma.document.findMany({
      where: {
        is_published: true,
        document_type: {
          in: ['TECHNICAL_GUIDE', 'MANUAL', 'BULLETIN', 'CATALOGUE'],
        },
      },
      include: {
        files: {
          select: {
            id: true,
            language_code: true,
            is_offline_downloadable: true,
            media_asset: {
              select: {
                id: true,
                url: true,
                filename: true,
                mime_type: true,
                size_bytes: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const docIds = rawDocuments.map((d) => d.id);
    const translations = await prisma.translation.findMany({
      where: {
        entity_type: { in: ['DOCUMENT', 'document'] },
        entity_id: { in: docIds },
        field: 'title',
      },
    });

    const titleMap = {};
    for (const t of translations) {
      if (!titleMap[t.entity_id] || t.language_code === 'en') {
        titleMap[t.entity_id] = t.value;
      }
    }

    const documents = rawDocuments.map((doc) => {
      const files = doc.files || [];
      const primaryFile = files.find((f) => f.language_code === 'en') || files[0] || null;
      const media = primaryFile?.media_asset || null;

      return {
        id: doc.id,
        title: titleMap[doc.id] || doc.document_type.replace(/_/g, ' '),
        type: doc.document_type,
        document_type: doc.document_type,
        category: doc.category_id || 'technical',
        product_id: doc.product_id,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        has_file: Boolean(media && media.url),
        file_size_bytes: media?.size_bytes || null,
        mime_type: media?.mime_type || 'application/pdf',
        filename: media?.filename || null,
        is_offline_downloadable: primaryFile?.is_offline_downloadable ?? false,
        access_level: 'OEM_PARTNER',
        download_url: media && media.url ? `/api/v1/documents/${doc.id}/download` : null,
        files: files.map((f) => ({
          id: f.id,
          language_code: f.language_code,
          is_offline_downloadable: f.is_offline_downloadable,
          size_bytes: f.media_asset?.size_bytes || null,
          mime_type: f.media_asset?.mime_type || null,
          filename: f.media_asset?.filename || null,
        })),
      };
    });

    sendSuccess(res, documents, 200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
