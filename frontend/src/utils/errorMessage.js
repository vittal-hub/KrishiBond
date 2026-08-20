export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  // No response reaching the browser at all (timeout / DNS / offline) is
  // most often the backend waking up from a Render cold start, not a real
  // application error - the raw axios message ("timeout of 45000ms
  // exceeded") is confusing to show a user, so give a friendlier one.
  if (error?.isNetworkError) {
    return 'The server is waking up - this can take up to a minute on the first request. Please try again shortly.';
  }
  // Field-level validation errors (see backend/src/middleware/validate.js)
  // are more useful than the generic "Validation failed" message alone.
  const fieldErrors = error?.response?.data?.errors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const messages = Object.values(fieldErrors).filter(Boolean);
    if (messages.length) return messages.join(' · ');
  }
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}
