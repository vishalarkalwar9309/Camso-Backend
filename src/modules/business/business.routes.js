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

module.exports = router;
