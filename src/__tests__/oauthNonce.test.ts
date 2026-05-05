import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { createAppleNoncePair, generateRandomNonce } from '../utils/oauthNonce';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  digestStringAsync: jest.fn(() => Promise.resolve('hashed-value')),
  getRandomValues: jest.fn((values: Uint8Array) => values),
}));

const mockedDigestStringAsync = jest.mocked(digestStringAsync);

beforeEach(() => {
  jest.clearAllMocks();
  mockedDigestStringAsync.mockResolvedValue('hashed-value');
});

describe('generateRandomNonce', () => {
  it('returns a URL-safe nonce with the requested length', () => {
    const nonce = generateRandomNonce(8, (values) => {
      values.set([0, 1, 2, 3, 62, 63, 64, 65]);
      return values;
    });

    expect(nonce).toBe('0123._-0');
    expect(nonce).toHaveLength(8);
    expect(nonce).toMatch(/^[0-9A-Za-z._-]+$/);
  });

  it('rejects non-positive lengths', () => {
    expect(() => generateRandomNonce(0)).toThrow('Nonce length must be greater than 0');
  });
});

describe('createAppleNoncePair', () => {
  it('returns a raw nonce and its SHA-256 hash', async () => {
    const pair = await createAppleNoncePair('raw-nonce');

    expect(pair).toEqual({
      rawNonce: 'raw-nonce',
      hashedNonce: 'hashed-value',
    });
    expect(mockedDigestStringAsync).toHaveBeenCalledWith(CryptoDigestAlgorithm.SHA256, 'raw-nonce');
  });
});
