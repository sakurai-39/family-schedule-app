import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';
import { createUser, getUser, updateUser } from '../services/firestore';

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
