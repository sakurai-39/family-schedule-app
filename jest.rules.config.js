module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@unimodules/.*|@react-navigation/.*|firebase|@firebase/.*))',
  ],
  testMatch: ['**/__tests__/**/*.rules.test.ts'],
  testTimeout: 30000,
};
