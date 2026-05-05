import { CryptoDigestAlgorithm, digestStringAsync, getRandomValues } from 'expo-crypto';

const NONCE_CHARACTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz._-';

export type RandomByteProvider = <T extends Uint8Array>(values: T) => T;

function fillSecureRandomValues<T extends Uint8Array>(values: T): T {
  return getRandomValues(values);
}

export function generateRandomNonce(
  length = 32,
  randomValues: RandomByteProvider = fillSecureRandomValues
): string {
  if (length <= 0) {
    throw new Error('Nonce length must be greater than 0');
  }

  const values = new Uint8Array(length);
  randomValues(values);

  return Array.from(values, (value) => NONCE_CHARACTERS[value % NONCE_CHARACTERS.length]).join('');
}

export type AppleNoncePair = {
  rawNonce: string;
  hashedNonce: string;
};

export async function createAppleNoncePair(
  rawNonce = generateRandomNonce()
): Promise<AppleNoncePair> {
  return {
    rawNonce,
    hashedNonce: await digestStringAsync(CryptoDigestAlgorithm.SHA256, rawNonce),
  };
}
