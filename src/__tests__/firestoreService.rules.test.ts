import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';
import {
  createUser,
  getUser,
  updateUser,
  createHousehold,
  getHousehold,
  addMember,
  removeMember,
  createInboxItem,
  getCalendarItem,
  promoteInboxToScheduled,
} from '../services/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test-service',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('user service', () => {
  it('createUser writes a user doc with all required fields', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    await createUser(aliceCtx.firestore() as any, {
      userId: 'user-A',
      displayName: 'alice',
      accountName: 'Alice',
      email: 'a@example.com',
    });
    const user = await getUser(aliceCtx.firestore() as any, 'user-A');
    expect(user).toBeDefined();
    expect(user?.displayName).toBe('alice');
    expect(user?.accountName).toBe('Alice');
    expect(user?.householdId).toBeNull();
  });

  it('updateUser modifies displayName but keeps email', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    await createUser(aliceCtx.firestore() as any, {
      userId: 'user-A',
      displayName: 'alice',
      accountName: 'Alice',
      email: 'a@example.com',
    });
    await updateUser(aliceCtx.firestore() as any, 'user-A', { displayName: 'アリス' });
    const user = await getUser(aliceCtx.firestore() as any, 'user-A');
    expect(user?.displayName).toBe('アリス');
    expect(user?.email).toBe('a@example.com');
  });

  it('createUser rejects invalid displayName (>6 chars)', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    await expect(
      createUser(aliceCtx.firestore() as any, {
        userId: 'user-A',
        displayName: 'abcdefg',
        accountName: 'A',
        email: 'a@example.com',
      })
    ).rejects.toThrow();
  });
});

describe('household service', () => {
  it('createHousehold creates a doc with creator as a member', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    await createUser(aliceCtx.firestore() as any, {
      userId: 'user-A',
      displayName: 'alice',
      accountName: 'Alice',
      email: 'a@example.com',
    });
    const householdId = await createHousehold(aliceCtx.firestore() as any, 'user-A');
    const household = await getHousehold(aliceCtx.firestore() as any, householdId);
    expect(household).toBeDefined();
    expect(household?.members).toEqual(['user-A']);
    expect(household?.inviteCode).toBeNull();
  });

  it('addMember adds a userId to members (capped at 2)', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    const householdId = await createHousehold(aliceCtx.firestore() as any, 'user-A');
    await addMember(aliceCtx.firestore() as any, householdId, 'user-B');
    const household = await getHousehold(aliceCtx.firestore() as any, householdId);
    expect(household?.members.sort()).toEqual(['user-A', 'user-B']);
  });

  it('addMember rejects when household already at max (2)', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    const householdId = await createHousehold(aliceCtx.firestore() as any, 'user-A');
    await addMember(aliceCtx.firestore() as any, householdId, 'user-B');
    await expect(addMember(aliceCtx.firestore() as any, householdId, 'user-C')).rejects.toThrow();
  });

  it('removeMember removes a userId from members (but cannot self-remove)', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    const householdId = await createHousehold(aliceCtx.firestore() as any, 'user-A');
    await addMember(aliceCtx.firestore() as any, householdId, 'user-B');
    await removeMember(aliceCtx.firestore() as any, householdId, 'user-B', 'user-A');
    const household = await getHousehold(aliceCtx.firestore() as any, householdId);
    expect(household?.members).toEqual(['user-A']);
  });

  it('removeMember refuses to remove self (誤タップ防止)', async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    const householdId = await createHousehold(aliceCtx.firestore() as any, 'user-A');
    await expect(
      removeMember(aliceCtx.firestore() as any, householdId, 'user-A', 'user-A')
    ).rejects.toThrow(/cannot remove yourself/i);
  });
});

describe('inbox/calendar_items service', () => {
  let householdId: string;

  beforeEach(async () => {
    const aliceCtx = testEnv.authenticatedContext('user-A');
    householdId = await createHousehold(aliceCtx.firestore() as any, 'user-A');
  });

  it('createInboxItem creates a doc with status=inbox, type=null', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore() as any;
    const itemId = await createInboxItem(aliceDb, householdId, {
      title: 'パンを買う',
      createdBy: 'user-A',
      inputDurationMs: 4500,
    });
    const item = await getCalendarItem(aliceDb, householdId, itemId);
    expect(item?.status).toBe('inbox');
    expect(item?.type).toBeNull();
    expect(item?.title).toBe('パンを買う');
    expect(item?.assignee).toBeNull();
    expect(item?.createdBy).toBe('user-A');
    expect(item?.inputDurationMs).toBe(4500);
  });

  it('createInboxItem rejects empty title', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore() as any;
    await expect(
      createInboxItem(aliceDb, householdId, {
        title: '',
        createdBy: 'user-A',
        inputDurationMs: null,
      })
    ).rejects.toThrow();
  });

  it('promoteInboxToScheduled changes status to scheduled with full event fields', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore() as any;
    const itemId = await createInboxItem(aliceDb, householdId, {
      title: '夫婦デート',
      createdBy: 'user-A',
      inputDurationMs: 3000,
    });
    const startAt = new Date('2026-06-01T19:00:00Z');
    await promoteInboxToScheduled(aliceDb, householdId, itemId, {
      type: 'event',
      title: '夫婦デート',
      assignee: 'both',
      startAt,
    });
    const item = await getCalendarItem(aliceDb, householdId, itemId);
    expect(item?.status).toBe('scheduled');
    expect(item?.type).toBe('event');
    expect(item?.assignee).toBe('both');
    expect(item?.startAt?.getTime()).toBe(startAt.getTime());
    expect(item?.createdBy).toBe('user-A');
  });

  it('promoteInboxToScheduled rejects event missing startAt', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore() as any;
    const itemId = await createInboxItem(aliceDb, householdId, {
      title: '何か',
      createdBy: 'user-A',
      inputDurationMs: null,
    });
    await expect(
      promoteInboxToScheduled(aliceDb, householdId, itemId, {
        type: 'event',
        title: '何か',
        assignee: 'user-A',
        startAt: null as unknown as Date,
      })
    ).rejects.toThrow();
  });

  it('promoteInboxToScheduled accepts task with null dueAt (やることリスト)', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore() as any;
    const itemId = await createInboxItem(aliceDb, householdId, {
      title: '保育園に連絡',
      createdBy: 'user-A',
      inputDurationMs: 2000,
    });
    await promoteInboxToScheduled(aliceDb, householdId, itemId, {
      type: 'task',
      title: '保育園に連絡',
      assignee: 'whoever',
      dueAt: null,
    });
    const item = await getCalendarItem(aliceDb, householdId, itemId);
    expect(item?.status).toBe('scheduled');
    expect(item?.type).toBe('task');
    expect(item?.dueAt).toBeNull();
  });
});
