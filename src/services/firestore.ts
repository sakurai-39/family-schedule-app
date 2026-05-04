import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User } from '../types/User';
import { validateDisplayName, sanitizeText } from '../utils/validation';

export type CreateUserInput = {
  userId: string;
  displayName: string;
  accountName: string;
  email: string;
};

export async function createUser(db: Firestore, input: CreateUserInput): Promise<void> {
  const sanitizedDisplayName = sanitizeText(input.displayName);
  const result = validateDisplayName(sanitizedDisplayName);
  if (!result.ok) {
    throw new Error(result.reason);
  }

  await setDoc(doc(db, 'users', input.userId), {
    displayName: sanitizedDisplayName,
    accountName: input.accountName,
    email: input.email,
    householdId: null,
    createdAt: serverTimestamp(),
  });
}

export async function getUser(db: Firestore, userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp
      ? createdAtRaw.toDate()
      : createdAtRaw instanceof Date
        ? createdAtRaw
        : new Date(0);

  return {
    userId,
    displayName: data.displayName,
    accountName: data.accountName,
    email: data.email,
    householdId: data.householdId ?? null,
    createdAt,
  };
}

export async function updateUser(
  db: Firestore,
  userId: string,
  updates: Partial<Pick<User, 'displayName' | 'householdId'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (updates.displayName !== undefined) {
    const sanitized = sanitizeText(updates.displayName);
    const result = validateDisplayName(sanitized);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    payload.displayName = sanitized;
  }

  if (updates.householdId !== undefined) {
    payload.householdId = updates.householdId;
  }

  await updateDoc(doc(db, 'users', userId), payload);
}
