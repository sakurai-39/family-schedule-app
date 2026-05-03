import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { setDoc, doc, getDoc } from 'firebase/firestore';
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

describe('users collection', () => {
  it('未認証ユーザーは users にアクセス不可', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'users/user-A')));
  });

  it('自分のドキュメントは読み書き可能', async () => {
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

  it('他人のドキュメントは読み書き不可', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(getDoc(doc(aliceDb, 'users/user-B')));
    await assertFails(setDoc(doc(aliceDb, 'users/user-B'), { displayName: 'fake' }));
  });
});

describe('households collection', () => {
  it('未認証ユーザーは households にアクセス不可', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'households/h-1')));
  });

  it('家族メンバーは自家族の households を読める', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), {
        members: ['user-A', 'user-B'],
        createdAt: new Date(),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      });
    });
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'households/h-1')));
  });

  it('家族外のメンバーは自家族の households を読めない', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), {
        members: ['user-A'],
        createdAt: new Date(),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      });
    });
    const eveDb = testEnv.authenticatedContext('user-E').firestore();
    await assertFails(getDoc(doc(eveDb, 'households/h-1')));
  });

  it('新規作成時、自分自身が members に含まれていれば成功', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'households/h-new'), {
        members: ['user-A'],
        createdAt: new Date(),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      })
    );
  });

  it('新規作成時、自分が members に含まれていないと失敗', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'households/h-new'), {
        members: ['user-B'],
        createdAt: new Date(),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      })
    );
  });
});

describe('calendar_items subcollection', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), {
        members: ['user-A', 'user-B'],
        createdAt: new Date(),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      });
    });
  });

  it('家族メンバーは calendar_items に書き込み可能', async () => {
    const aliceDb = testEnv.authenticatedContext('user-A').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'households/h-1/calendar_items/item-1'), {
        status: 'inbox',
        type: null,
        title: 'パンを買う',
        assignee: null,
        startAt: null,
        dueAt: null,
        memo: '',
        isCompleted: false,
        recurrence: null,
        createdBy: 'user-A',
        inputDurationMs: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  });

  it('家族外のメンバーは calendar_items に書き込み不可', async () => {
    const eveDb = testEnv.authenticatedContext('user-E').firestore();
    await assertFails(
      setDoc(doc(eveDb, 'households/h-1/calendar_items/item-evil'), {
        status: 'inbox',
        type: null,
        title: '不正書き込み',
        createdBy: 'user-E',
      })
    );
  });

  it('家族外のメンバーは calendar_items を読めない', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1/calendar_items/item-1'), {
        status: 'scheduled',
        type: 'event',
        title: '夫婦デート',
        createdBy: 'user-A',
      });
    });
    const eveDb = testEnv.authenticatedContext('user-E').firestore();
    await assertFails(getDoc(doc(eveDb, 'households/h-1/calendar_items/item-1')));
  });

  it('未認証ユーザーは calendar_items にアクセス不可', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'households/h-1/calendar_items/item-1')));
  });

  it('削除済みメンバー（members から外された）はアクセス不可', async () => {
    const bobDb = testEnv.authenticatedContext('user-B').firestore();
    // 最初は B もメンバーなので可能
    await assertSucceeds(
      setDoc(doc(bobDb, 'households/h-1/calendar_items/item-2'), {
        status: 'inbox',
        type: null,
        title: 'B のメモ',
        createdBy: 'user-B',
      })
    );
    // B を members から外す
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households/h-1'), {
        members: ['user-A'],
        createdAt: new Date(),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      });
    });
    // 外された後は B からアクセス不可
    await assertFails(getDoc(doc(bobDb, 'households/h-1/calendar_items/item-2')));
  });
});
