import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

const rulesDescribe = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
let env: RulesTestEnvironment;

rulesDescribe('Firestore rules', () => {
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({
      projectId: 'stock-pick-test',
      firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
    });
  });
  beforeEach(() => env.clearFirestore());
  afterAll(() => env.cleanup());

  it('올바른 초기 사용자 생성을 허용한다', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'users', 'jaehyung'), {
      name: '재형', activeStockIds: [], createdAt: serverTimestamp(),
    }));
  });

  it('활성 문서 없는 배열 단독 변경을 거부한다', async () => {
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'users', 'u1'), {
      name: '친구', activeStockIds: [], createdAt: new Date(),
    }));
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'users', 'u1'), { activeStockIds: ['u1__AAPL'] }, { merge: true }));
  });

  it('사용자 배열과 활성 종목의 원자적 생성을 허용한다', async () => {
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'users', 'u1'), {
      name: '친구', activeStockIds: [], createdAt: new Date(),
    }));
    const db = env.unauthenticatedContext().firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', 'u1'), { activeStockIds: ['u1__AAPL'] });
    batch.set(doc(db, 'activeStocks', 'u1__AAPL'), {
      userId: 'u1', symbol: 'AAPL', name: 'Apple', currency: 'USD', buyPrice: 100,
      buyPriceAsOf: new Date(), addedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });
});
