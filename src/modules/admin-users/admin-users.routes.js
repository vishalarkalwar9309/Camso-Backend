'use strict';

/**
 * admin-users.routes — Routes for Admin User management and Organization approvals.
 */

const { Router } = require('express');
const controller = require('./admin-users.controller');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');

// 1. Admin Users Router — mounted at /api/v1/admin/admin-users
const adminUsersRouter = Router();
adminUsersRouter.use(adminGuard);

adminUsersRouter.post('/', requireRole('SUPER_ADMIN'), controller.createAdmin);
adminUsersRouter.get('/', requireRole('SUPER_ADMIN'), controller.listAdmins);
adminUsersRouter.patch('/:id/status', requireRole('SUPER_ADMIN'), controller.updateAdminStatus);

// 2. Organizations Approval Router — mounted at /api/v1/admin/organizations
const adminOrgsRouter = Router();
adminOrgsRouter.use(adminGuard);

adminOrgsRouter.get('/', requireRole('SUPER_ADMIN', 'CONTENT_ADMIN', 'VIEWER'), controller.listOrganizations);
adminOrgsRouter.patch('/:id/status', requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'), controller.updateOrganizationApproval);

module.exports = {
  adminUsersRouter,
  adminOrgsRouter,
};
