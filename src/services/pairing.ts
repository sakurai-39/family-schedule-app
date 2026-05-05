import { getRandomValues } from 'expo-crypto';
import {
  arrayUnion,
  collection,
  doc,
  Firestore,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  HOUSEHOLD_MAX_MEMBERS,
  INVITE_CODE_EXPIRY_HOURS,
  INVITE_CODE_LENGTH,
} from '../types/Household';
import { validateInviteCode } from '../utils/validation';

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

export type GenerateInviteCodeOptions = {
  generateCode?: () => string;
  now?: () => Date;
};

export async function generateInviteCode(
  db: Firestore,
  householdId: string,
  options: GenerateInviteCodeOptions = {}
): Promise<string> {
  const generateCode = options.generateCode ?? generateInviteCodeValue;
  const now = options.now ?? (() => new Date());
  const code = generateCode();
  const validation = validateInviteCode(code);

  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const inviteCodeExpiresAt = new Date(now().getTime() + INVITE_CODE_EXPIRY_HOURS * 60 * 60 * 1000);

  await updateDoc(doc(db, 'households', householdId), {
    inviteCode: code,
    inviteCodeExpiresAt,
  });

  return code;
}

export type JoinHouseholdByCodeOptions = {
  now?: () => Date;
};

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  return null;
}

export async function joinHouseholdByCode(
  db: Firestore,
  userId: string,
  code: string,
  options: JoinHouseholdByCodeOptions = {}
): Promise<string> {
  const validation = validateInviteCode(code);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const now = options.now ?? (() => new Date());
  const householdsQuery = query(collection(db, 'households'), where('inviteCode', '==', code));
  const snap = await getDocs(householdsQuery);

  if (snap.empty || snap.docs.length === 0) {
    throw new Error('招待コードが見つかりません');
  }

  const householdDoc = snap.docs[0];
  if (!householdDoc) {
    throw new Error('招待コードが見つかりません');
  }

  const data = householdDoc.data();
  const inviteCodeExpiresAt = toDate(data.inviteCodeExpiresAt);

  if (!inviteCodeExpiresAt || inviteCodeExpiresAt.getTime() <= now().getTime()) {
    throw new Error('招待コードの有効期限が切れています');
  }

  const members = Array.isArray(data.members) ? (data.members as string[]) : [];
  if (members.includes(userId)) {
    return householdDoc.id;
  }
  if (members.length >= HOUSEHOLD_MAX_MEMBERS) {
    throw new Error('家族メンバーは2人までです');
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'households', householdDoc.id), {
    members: arrayUnion(userId),
    inviteCode: null,
    inviteCodeExpiresAt: null,
  });
  batch.update(doc(db, 'users', userId), { householdId: householdDoc.id });
  await batch.commit();

  return householdDoc.id;
}
