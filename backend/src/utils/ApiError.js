class ApiError extends Error {
  constructor(statusCode, message, details = null, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    // Field -> message map, e.g. { unit: 'Invalid enum value...' }, so
    // clients can highlight the exact form field that failed validation.
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
