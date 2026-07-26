export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}
