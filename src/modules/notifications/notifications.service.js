'use strict';

/**
 * src/modules/notifications/notifications.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic for public notification feed.
 *
 * OVERALL DESIGN:
 *   Retrieves SENT notifications and merges their translated title/body.
 *
 * ELEMENTS:
 *   getPublicFeed — orchestrates feed retrieval and translations
 *
 * FINAL OUTPUT:
 *   module.exports = notificationsService
 *
 * IMPORTED BY:
 *   notifications.controller.js
 */

const notificationsRepository = require('./notifications.repository');
const { getManyTranslations, attachManyTranslations } = require('../../core/utils/translate');
const { buildPaginationMeta } = require('../../core/utils/pagination');

const notificationsService = {
  /**
   * getPublicFeed
   * Fetches paginated notifications and their translated fields.
   */
  async getPublicFeed(query) {
    const { total, data, page, pageSize } = await notificationsRepository.findPublicFeed(query);
    
    if (data.length > 0) {
      const entityIds = data.map((n) => n.id);
      const translations = await getManyTranslations('NOTIFICATION', entityIds);
      const translatedData = attachManyTranslations(data, translations, query.lang || 'en');
      
      return {
        data: translatedData,
        meta: buildPaginationMeta(page, pageSize, total)
      };
    }

    return {
      data: [],
      meta: buildPaginationMeta(page, pageSize, total)
    };
  }
};

module.exports = notificationsService;
