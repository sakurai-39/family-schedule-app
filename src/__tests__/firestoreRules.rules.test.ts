import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
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

function householdPayload(members: string[], inviteCode: string | null = null) {
  return {
    members,
    createdAt: new Date(),
    inviteCode,
    inviteCodeExpiresAt: inviteCode ? new Date('2099-01-01T00:00:00.000Z') : null,
  };
}

function validInboxPayload(createdBy: string, overrides: Record<string, unknown> = {}) {
  return {
    status: 'inbox',
    type: null,
    title: 'パンを買う',
    assignee: null,
    startAt: null,
    dueAt: null,
    memo: '',
    isCompleted: false,
    recurrence: null,
    createdBy,
    inputDurationMs: 5000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function validScheduledEventPayload(createdBy: string, overrides: Record<string, unknown> = {}) {
  return {
    status: 'scheduled',
    type: 'event',
    title: '保育園面談',
    assignee: 'both',
    startAt: new Date('2026-06-01T10:00:00.000Z'),
    dueAt: null,
    memo: '',
    isCompleted: false,
    recurrence: null,
    createdBy,
    inputDurationMs: 5000,
    createdAt: new Date('2026-05-08T00:00:00.000Z'),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe('users collection', () => {
  it('rejects unauthenticated access', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'users/user-A')));
  });

  it('allows a signed-in user to read and write their own user document', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users/user-A'), {
        displayName: 'alice',
        accountName: 'Alice',
        email: 'a@example.com',
        householdId: null,
        createdAt: new Date(),
      })
    );
    await assertSucceeds(getDoc(doc(aliceDb, 'users/user-A')));
  });

  it('rejects access to another user document', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(getDoc(doc(aliceDb, 'users/user-B')));
    await assertFails(setDoc(doc(aliceDb, 'users/user-B'), { displayName: 'fake' }));
  });
});

describe('households collection', () => {
  it('rejects unauthenticated access', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'households/h-1')));
  });

  it('allows a household member to read their household', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A', 'user-B']));
    });
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'households/h-1')));
  });

  it('rejects reading households outside the signed-in user membership', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A']));
    });
    const eveDb = testEnv.authenticatedContext('user-E').firestore();
    await assertFails(getDoc(doc(eveDb, 'households/h-1')));
  });

  it('allows creating a household when the signed-in user is included in members', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(setDoc(doc(aliceDb, 'households/h-new'), householdPayload(['user-A'])));
  });

  it('rejects creating a household that excludes the signed-in user', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(setDoc(doc(aliceDb, 'households/h-new'), householdPayload(['user-B'])));
  });

  it('rejects adding a member without an active invite code', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A']));
    });

    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(updateDoc(doc(aliceDb, 'households/h-1'), { members: ['user-A', 'user-B'] }));
  });

  it('allows joining a household with an active invite code', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A'], '482917'));
    });

    const bobDb = testEnv.authenticatedContext('user-B').firestore();
    await assertSucceeds(
      updateDoc(doc(bobDb, 'households/h-1'), {
        members: ['user-A', 'user-B'],
        inviteCode: null,
        inviteCodeExpiresAt: null,
      })
    );
  });

  it('allows looking up a household by invite code', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A'], '482917'));
    });

    const bobDb = testEnv.authenticatedContext('user-B').firestore();
    await assertSucceeds(
      getDocs(query(collection(bobDb, 'households'), where('inviteCode', '==', '482917')))
    );
  });

  it('rejects joining a household with an expired invite code', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), {
        ...householdPayload(['user-A'], '482917'),
        inviteCodeExpiresAt: new Date('2000-01-01T00:00:00.000Z'),
      });
    });

    const bobDb = testEnv.authenticatedContext('user-B').firestore();
    await assertFails(
      updateDoc(doc(bobDb, 'households/h-1'), {
        members: ['user-A', 'user-B'],
        inviteCode: null,
        inviteCodeExpiresAt: null,
      })
    );
  });

  it('rejects joining as the third household member', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'households/h-1'),
        householdPayload(['user-A', 'user-B'], '482917')
      );
    });

    const charlieDb = testEnv.authenticatedContext('user-C').firestore();
    await assertFails(
      updateDoc(doc(charlieDb, 'households/h-1'), {
        members: ['user-A', 'user-B', 'user-C'],
        inviteCode: null,
        inviteCodeExpiresAt: null,
      })
    );
  });

  it('rejects removing yourself from household members', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A', 'user-B']));
    });

    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(updateDoc(doc(aliceDb, 'households/h-1'), { members: ['user-B'] }));
  });

  it('allows removing another household member', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A', 'user-B']));
    });

    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(updateDoc(doc(aliceDb, 'households/h-1'), { members: ['user-A'] }));
  });

  it('allows a household member to reissue an invite code', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A']));
    });

    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'households/h-1'), {
        inviteCode: '482917',
        inviteCodeExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
      })
    );
  });
});

describe('calendar_items subcollection', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A', 'user-B']));
    });
  });

  it('allows a household member to create a valid inbox item', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'households/h-1/calendar_items/item-1'), validInboxPayload('user-A'))
    );
  });

  it('rejects inbox create when createdBy does not match the signed-in user', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'households/h-1/calendar_items/item-forged'), validInboxPayload('user-B'))
    );
  });

  it('rejects direct scheduled item creation by a household member', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, 'households/h-1/calendar_items/item-scheduled'),
        validScheduledEventPayload('user-A', { createdAt: serverTimestamp() })
      )
    );
  });

  it('allows converting an inbox item to a scheduled event with required fields', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    const itemRef = doc(aliceDb, 'households/h-1/calendar_items/item-promote');
    await assertSucceeds(setDoc(itemRef, validInboxPayload('user-A')));

    await assertSucceeds(
      updateDoc(itemRef, {
        status: 'scheduled',
        type: 'event',
        title: '保育園面談',
        assignee: 'both',
        startAt: new Date('2026-06-01T10:00:00.000Z'),
        dueAt: null,
        memo: '',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('rejects converting an inbox item to an event without startAt', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    const itemRef = doc(aliceDb, 'households/h-1/calendar_items/item-no-start');
    await assertSucceeds(setDoc(itemRef, validInboxPayload('user-A')));

    await assertFails(
      updateDoc(itemRef, {
        status: 'scheduled',
        type: 'event',
        title: '保育園面談',
        assignee: 'both',
        startAt: null,
        dueAt: null,
        memo: '',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('rejects changing createdBy while updating a scheduled item', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'households/h-1/calendar_items/item-immutable'),
        validScheduledEventPayload('user-A', {
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        })
      );
    });

    await assertFails(
      updateDoc(doc(aliceDb, 'households/h-1/calendar_items/item-immutable'), {
        title: '変更後',
        createdBy: 'user-B',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('rejects writes by users outside the household', async () => {
    const eveDb = testEnv.authenticatedContext('user-E').firestore();
    await assertFails(
      setDoc(doc(eveDb, 'households/h-1/calendar_items/item-evil'), validInboxPayload('user-E'))
    );
  });

  it('rejects reads by users outside the household', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'households/h-1/calendar_items/item-1'),
        validScheduledEventPayload('user-A', {
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        })
      );
    });
    const eveDb = testEnv.authenticatedContext('user-E').firestore();
    await assertFails(getDoc(doc(eveDb, 'households/h-1/calendar_items/item-1')));
  });

  it('rejects unauthenticated reads', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'households/h-1/calendar_items/item-1')));
  });

  it('rejects access after a member is removed from the household', async () => {
    const bobDb = testEnv.authenticatedContext('user-B').firestore();
    await assertSucceeds(
      setDoc(doc(bobDb, 'households/h-1/calendar_items/item-2'), validInboxPayload('user-B'))
    );

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), householdPayload(['user-A']));
    });

    await assertFails(getDoc(doc(bobDb, 'households/h-1/calendar_items/item-2')));
  });
});
