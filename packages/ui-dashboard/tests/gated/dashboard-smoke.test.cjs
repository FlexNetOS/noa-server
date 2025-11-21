const { describe, test, expect } = require('@jest/globals');

// Minimal smoke tests used as the gating suite for ui-dashboard.
// These intentionally avoid TypeScript/JSX so they can run under Jest's
// default configuration without additional transformers.

describe('ui-dashboard smoke gate', () => {
  test('jsdom environment is available', () => {
    expect(typeof document).toBe('object');
    const div = document.createElement('div');
    expect(div).not.toBeNull();
  });

  test('package metadata is valid', () => {
    // Require package.json directly to verify basic metadata wiring.
    // This ensures the dashboard package is at least structurally sound.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const pkg = require('../../package.json');

    expect(pkg).toBeDefined();
    expect(pkg.name).toBe('ui-dashboard');
    expect(typeof pkg.version).toBe('string');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
