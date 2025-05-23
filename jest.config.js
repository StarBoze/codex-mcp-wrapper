module.exports = {
  testEnvironment: 'node',
  setupFiles: ['ts-node/register/transpile-only'],
  transform: {
    '^.+\\.ts$': '<rootDir>/ts-jest-transformer.js'
  }
};
