module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/health', '<rootDir>/errors'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'health/src/**/*.ts',
    'errors/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
