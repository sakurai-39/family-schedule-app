import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collection,
  addDoc,
  arrayUnion,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { User } from '../types/User';
import { Household, HOUSEHOLD_MAX_MEMBERS } from '../types/Household';
import {
  CalendarItem,
  InboxItemDraft,
  ScheduledItemDraft,
  ItemStatus,
} from '../types/CalendarItem';
import {
  validateDisplayName,
  validateTitle,
  sanitizeText,
  isValidScheduledItem,
} from '../utils/validation';

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
  const household = await getHousehold(db, householdId);
  if (!household) {
    throw new Error(`household ${householdId} not found`);
  }
  await updateDoc(doc(db, 'households', householdId), {
    members: household.members.filter((memberId) => memberId !== targetUserId),
  });
}

export async function createInboxItem(
  db: Firestore,
  householdId: string,
  draft: InboxItemDraft
): Promise<string> {
  const sanitizedTitle = sanitizeText(draft.title);
  const result = validateTitle(sanitizedTitle);
  if (!result.ok) {
    throw new Error(result.reason);
  }

  const ref = await addDoc(collection(db, `households/${householdId}/calendar_items`), {
    status: 'inbox',
    type: null,
    title: sanitizedTitle,
    assignee: null,
    startAt: null,
    dueAt: null,
    memo: '',
    isCompleted: false,
    recurrence: null,
    createdBy: draft.createdBy,
    inputDurationMs: draft.inputDurationMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCalendarItem(
  db: Firestore,
  householdId: string,
  itemId: string
): Promise<CalendarItem | null> {
  const snap = await getDoc(doc(db, `households/${householdId}/calendar_items`, itemId));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();

  const toDate = (raw: unknown): Date | null => {
    if (raw instanceof Timestamp) return raw.toDate();
    if (raw instanceof Date) return raw;
    return null;
  };

  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp
      ? createdAtRaw.toDate()
      : createdAtRaw instanceof Date
        ? createdAtRaw
        : new Date(0);

  const updatedAtRaw = data.updatedAt;
  const updatedAt =
    updatedAtRaw instanceof Timestamp
      ? updatedAtRaw.toDate()
      : updatedAtRaw instanceof Date
        ? updatedAtRaw
        : new Date(0);

  return {
    itemId,
    status: data.status,
    type: data.type ?? null,
    title: data.title,
    assignee: data.assignee ?? null,
    startAt: toDate(data.startAt),
    dueAt: toDate(data.dueAt),
    memo: data.memo ?? '',
    isCompleted: data.isCompleted ?? false,
    recurrence: null,
    createdBy: data.createdBy,
    inputDurationMs: data.inputDurationMs ?? null,
    createdAt,
    updatedAt,
  };
}

export async function promoteInboxToScheduled(
  db: Firestore,
  householdId: string,
  itemId: string,
  draft: ScheduledItemDraft
): Promise<void> {
  if (!isValidScheduledItem(draft)) {
    throw new Error('Invalid scheduled item draft (missing required fields)');
  }

  const sanitizedTitle = sanitizeText(draft.title);
  const sanitizedMemo = draft.memo !== undefined ? sanitizeText(draft.memo) : '';

  const updates: Record<string, unknown> = {
    status: 'scheduled',
    type: draft.type,
    title: sanitizedTitle,
    assignee: draft.assignee,
    memo: sanitizedMemo,
    updatedAt: serverTimestamp(),
  };

  if (draft.type === 'event') {
    updates.startAt = draft.startAt;
    updates.dueAt = null;
  } else {
    updates.startAt = null;
    updates.dueAt = draft.dueAt;
  }

  await updateDoc(doc(db, `households/${householdId}/calendar_items`, itemId), updates);
}

export async function updateCalendarItem(
  db: Firestore,
  householdId: string,
  itemId: string,
  updates: Partial<
    Pick<CalendarItem, 'title' | 'memo' | 'isCompleted' | 'assignee' | 'startAt' | 'dueAt'>
  >
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    const sanitized = sanitizeText(updates.title);
    const result = validateTitle(sanitized);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    payload.title = sanitized;
  }

  if (updates.memo !== undefined) {
    payload.memo = sanitizeText(updates.memo);
  }

  if (updates.isCompleted !== undefined) {
    payload.isCompleted = updates.isCompleted;
  }

  if (updates.assignee !== undefined) {
    payload.assignee = updates.assignee;
  }

  if (updates.startAt !== undefined) {
    payload.startAt = updates.startAt;
  }

  if (updates.dueAt !== undefined) {
    payload.dueAt = updates.dueAt;
  }

  payload.updatedAt = serverTimestamp();

  await updateDoc(doc(db, `households/${householdId}/calendar_items`, itemId), payload);
}

export async function deleteCalendarItem(
  db: Firestore,
  householdId: string,
  itemId: string
): Promise<void> {
  await deleteDoc(doc(db, `households/${householdId}/calendar_items`, itemId));
}

export type ListItemsOptions = {
  status?: ItemStatus;
};

export async function listCalendarItems(
  db: Firestore,
  householdId: string,
  options: ListItemsOptions = {}
): Promise<CalendarItem[]> {
  const colRef = collection(db, `households/${householdId}/calendar_items`);
  const constraints = [];
  if (options.status !== undefined) {
    constraints.push(where('status', '==', options.status));
  }
  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(colRef, ...constraints);
  const snap = await getDocs(q);

  const toDate = (raw: unknown): Date | null => {
    if (raw instanceof Timestamp) return raw.toDate();
    if (raw instanceof Date) return raw;
    return null;
  };

  return snap.docs.map((d) => {
    const data = d.data();
    const createdAtRaw = data.createdAt;
    const createdAt =
      createdAtRaw instanceof Timestamp
        ? createdAtRaw.toDate()
        : createdAtRaw instanceof Date
          ? createdAtRaw
          : new Date(0);

    const updatedAtRaw = data.updatedAt;
    const updatedAt =
      updatedAtRaw instanceof Timestamp
        ? updatedAtRaw.toDate()
        : updatedAtRaw instanceof Date
          ? updatedAtRaw
          : new Date(0);

    return {
      itemId: d.id,
      status: data.status,
      type: data.type ?? null,
      title: data.title,
      assignee: data.assignee ?? null,
      startAt: toDate(data.startAt),
      dueAt: toDate(data.dueAt),
      memo: data.memo ?? '',
      isCompleted: data.isCompleted ?? false,
      recurrence: null,
      createdBy: data.createdBy,
      inputDurationMs: data.inputDurationMs ?? null,
      createdAt,
      updatedAt,
    };
  });
}
