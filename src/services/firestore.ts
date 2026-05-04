import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  collection,
  addDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { User } from '../types/User';
import { Household, HOUSEHOLD_MAX_MEMBERS } from '../types/Household';
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

export async function createHousehold(db: Firestore, creatorUserId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'households'), {
    members: [creatorUserId],
    createdAt: serverTimestamp(),
    inviteCode: null,
    inviteCodeExpiresAt: null,
  });
  return ref.id;
}

export async function getHousehold(db: Firestore, householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
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

  const expiresAtRaw = data.inviteCodeExpiresAt;
  const inviteCodeExpiresAt =
    expiresAtRaw instanceof Timestamp
      ? expiresAtRaw.toDate()
      : expiresAtRaw instanceof Date
        ? expiresAtRaw
        : null;

  return {
    householdId,
    members: Array.isArray(data.members) ? (data.members as string[]) : [],
    createdAt,
    inviteCode: data.inviteCode ?? null,
    inviteCodeExpiresAt,
  };
}

export async function addMember(
  db: Firestore,
  householdId: string,
  newUserId: string
): Promise<void> {
  const household = await getHousehold(db, householdId);
  if (!household) {
    throw new Error(`household ${householdId} not found`);
  }
  if (household.members.includes(newUserId)) {
    return;
  }
  if (household.members.length >= HOUSEHOLD_MAX_MEMBERS) {
    throw new Error(`household already has ${HOUSEHOLD_MAX_MEMBERS} members (max)`);
  }
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayUnion(newUserId),
  });
}

export async function removeMember(
  db: Firestore,
  householdId: string,
  targetUserId: string,
  callerUserId: string
): Promise<void> {
  if (targetUserId === callerUserId) {
    throw new Error('cannot remove yourself from a household');
  }
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayRemove(targetUserId),
  });
}
