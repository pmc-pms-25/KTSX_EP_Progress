import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrolling; the app calls window.scrollTo on page changes.
// Node-environment test files (server, reconciliation) have no window.
if (typeof window !== 'undefined') window.scrollTo = () => {};
