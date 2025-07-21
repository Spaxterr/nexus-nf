/** @type {import('jest').Config} */
export default {
    preset: 'ts-jest',
    collectCoverage: true,
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/docs/',
      '/dist/',
      './src/test/mocks/*'
    ],
    testEnvironment: 'node',
};

