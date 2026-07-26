const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, 'Validation failed', details));
  }
  if (result.data.body) req.body = result.data.body;
  next();
};

module.exports = validate;
