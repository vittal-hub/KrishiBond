import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement IntersectionObserver, which the landing page's
// scroll-reveal hook (useInView) relies on.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = global.IntersectionObserver || MockIntersectionObserver;
