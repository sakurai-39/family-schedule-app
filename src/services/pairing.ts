import { getRandomValues } from 'expo-crypto';
import { INVITE_CODE_LENGTH } from '../types/Household';

const INVITE_CODE_RANGE = 10 ** INVITE_CODE_LENGTH;
const UINT32_RANGE = 0x100000000;
const UNBIASED_UINT32_LIMIT = Math.floor(UINT32_RANGE / INVITE_CODE_RANGE) * INVITE_CODE_RANGE;

export type RandomValuesProvider = <T extends Uint32Array>(values: T) => T;

function fillSecureRandomValues<T extends Uint32Array>(values: T): T {
  return getRandomValues(values);
}

export function generateInviteCodeValue(
  randomValues: RandomValuesProvider = fillSecureRandomValues
): string {
  const values = new Uint32Array(1);

  while (true) {
    randomValues(values);
    const value = values[0] ?? 0;

    if (value < UNBIASED_UINT32_LIMIT) {
      return String(value % INVITE_CODE_RANGE).padStart(INVITE_CODE_LENGTH, '0');
    }
  }
}
