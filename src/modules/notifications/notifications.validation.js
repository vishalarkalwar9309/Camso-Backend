'use strict';

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const sendNotificationSchema = Joi.object({
  title: Joi.string().trim().required().max(255).messages({
    'any.required': 'Notification title is required.',
    'string.empty': 'Notification title cannot be empty.',
  }),
  body: Joi.string().trim().allow('').max(1000).default(''),
  target_type: Joi.string().valid('ALL_USERS', 'PLATFORM', 'LANGUAGE').default('ALL_USERS'),
  target_value: Joi.string().trim().allow(null, '').default(null),
  data: Joi.object().unknown().default({}),
});

const listFeedSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).optional(),
  sort: Joi.string().optional(),
  lang: Joi.string().trim().min(2).max(10).optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(ApiError.badRequest(error.message, details));
    }
    req.body = value;
    next();
  };
}

module.exports = {
  sendNotificationSchema,
  listFeedSchema,
  validate,
};
