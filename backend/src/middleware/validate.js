const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    // Field name as it appears in the request body (e.g. "unit" rather than
    // "body.unit"), so the frontend can map each error straight onto a form
    // field without needing to know about the { body, params, query } wrapper.
    const errors = {};
    result.error.issues.forEach((i) => {
      const field = i.path[i.path.length - 1] ?? i.path.join('.');
      if (!errors[field]) errors[field] = i.message;
    });
    return next(new ApiError(400, 'Validation failed', details, errors));
  }
  if (result.data.body) req.body = result.data.body;
  next();
};

module.exports = validate;
