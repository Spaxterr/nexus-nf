/** @type {import('jest').Config} */
export default {
    preset: 'ts-jest',
    collectCoverage: true,
    setupFilesAfterEnv: ['./src/test/setup.ts'],
    transform: {
      '^.+\\.(ts|tsx)?$': 'ts-jest',
      '^.+\\.(js|jsx)$': 'babel-jest',
    },
    transformIgnorePatterns: [
      "node_modules/(?!(ora|chalk|cli-cursor))",
    ],
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/docs/',
      '/dist/',
      './src/test/mocks/*'
    ],
    testEnvironment: 'node',
};

