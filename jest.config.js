/**
 * Jest Configuration for Noa Server
 * Comprehensive testing setup with 80%+ coverage targets
 */

export default {
  // Use Node.js as test environment for backend, jsdom for frontend
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'tests/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds - fail tests if below 80%
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,jsx,ts,tsx}',
    'packages/*/server/**/*.{js,ts}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/vite-env.d.ts',
    '!packages/*/src/main.tsx',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
  ],

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/*.spec.{js,jsx,ts,tsx}',
  ],

  // Transform files with babel-jest and ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'],
      },
    ],
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/packages/ui-dashboard/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.venv/', '/claude-suite.zip'],

  // Global timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Projects for different test environments
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['**/packages/ui-dashboard/src/**/__tests__/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '**/packages/ui-dashboard/server/**/*.test.js',
        '**/tests/integration/**/*.test.js',
      ],
    },
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['**/tests/unit/**/*.test.{js,ts}'],
    },
  ],
};
