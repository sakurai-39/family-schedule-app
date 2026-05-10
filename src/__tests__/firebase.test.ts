import { auth, db } from '../services/firebase';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ name: 'auth-mock' })),
  getReactNativePersistence: jest.fn(() => ({ type: 'react-native-persistence' })),
  initializeAuth: jest.fn(() => ({ name: 'auth-mock' })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ name: 'firestore-mock' })),
}));

describe('Firebase initialization', () => {
  it('exports auth instance', () => {
    expect(auth).toBeDefined();
    expect(typeof auth).toBe('object');
  });

  it('exports firestore instance', () => {
    expect(db).toBeDefined();
    expect(typeof db).toBe('object');
  });
});
