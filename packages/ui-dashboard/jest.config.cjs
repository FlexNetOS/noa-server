/**
 * Jest configuration for ui-dashboard
 * Enables TypeScript + TSX testing with jsdom using ts-jest ESM preset.
 */

module.exports = {
  // Use ts-jest ESM preset so we can run TS/TSX tests in a modern environment
  preset: 'ts-jest/presets/default-esm',

  testEnvironment: 'jsdom',

  // Limit Jest to this package's source and local tests
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)',
    '<rootDir>/tests/**/*.test.(ts|tsx)',
  ],

  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
    // Allow modern JS (including import syntax) in shared setup files
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Treat TS/TSX as ESM so "import" syntax works cleanly
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  moduleNameMapper: {
    // Local path alias
    '^@/(.*)$': '<rootDir>/src/$1',

    // Reuse shared Jest style and file mocks from the monorepo root tests
    '\\.(css|less|scss|sass)$': '<rootDir>/../../tests/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/../../tests/__mocks__/fileMock.js',
  },

  // Reuse the root Jest setup (jest-dom, global fetch/WebSocket mocks, etc.)
  setupFilesAfterEnv: ['<rootDir>/../../tests/setup.js'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
};
