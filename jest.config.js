// jest.config.js
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testPathPattern: '/__tests__/',
  setupFilesAfterFramework: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: ['services/**/*.ts', 'lib/**/*.ts', 'app/api/**/*.ts'],
}
module.exports = config
