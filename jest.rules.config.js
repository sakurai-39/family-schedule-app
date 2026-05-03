module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.rules.test.ts'],
  testTimeout: 30000,
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  moduleNameMapper: {
    'postinstall\\.mjs$': '<rootDir>/jest.firebaseUtilStub.js',
  },
};
