'use strict';

/**
 * src/modules/faqs/faqs.service.js
 *
 * WHAT THIS FILE DOES:
 *   Service layer for FAQs business logic.
 *   Coordinates repository queries, pagination meta, and polymorphic translation merging for questions & answers.
 *
 * OVERALL DESIGN:
 *   Handles business rules for public FAQ listing.
 *   Uses faqsRepository for database access and translate.js for localized question/answer retrieval.
 *   Does NOT import Prisma directly.
 *
 * ELEMENTS IN THIS FILE:
 *   - listPublishedFaqs(filters, query) — list published FAQs with pagination and i18n
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing service methods for faqs module.
 *
 * IMPORTED BY:
 *   src/modules/faqs/faqs.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const faqsRepository = require('./faqs.repository');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');
const { getTranslations, attachTranslations } = require('../../core/utils/translate');

const faqsService = {
  /**
   * listPublishedFaqs
   *
   * USE: Retrieves a paginated list of published FAQs with translated question & answer for the requested language.
   *
   * HOW IT WORKS:
   *   1. Parses pagination options from query (default sort_order asc).
   *   2. Queries faqsRepository for published FAQs.
   *   3. Fetches translations for each FAQ and attaches localized question and answer.
   *   4. Builds pagination metadata envelope.
   *
   * CONCEPTS: Business service layer, polymorphic i18n translation, pagination envelope.
   *
   * PLACES IMPORTED AND USED: src/modules/faqs/faqs.controller.js
   *
   * @param {object} filters — { category, product_id }
   * @param {object} query — raw req.query object for pagination & lang
   * @returns {Promise<{ faqs: Array<object>, pagination: object }>}
   */
  async listPublishedFaqs(filters, query) {
    const paginationOptions = parsePagination(query, { sort: 'sort_order:asc' });
    const [total, records] = await faqsRepository.findPublishedFaqs(filters, paginationOptions);

    const faqs = await Promise.all(
      records.map(async (faq) => {
        const translations = await getTranslations('FAQ', faq.id);
        return attachTranslations(faq, translations, query.lang || 'en');
      }),
    );

    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

    return { faqs, pagination: meta };
  },
};

module.exports = faqsService;
