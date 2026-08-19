import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, increment, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

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

  it('사용자당 10개까지 허용하고 11번째를 거부한다', async () => {
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'users', 'u1'), {
      name: '친구', activeStockIds: [], createdAt: new Date(),
    }));
    const db = env.unauthenticatedContext().firestore();
    const ids: string[] = [];
    for (let index = 0; index < 10; index++) {
      const id = `u1__S${index}`;
      ids.push(id);
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', 'u1'), { activeStockIds: [...ids] });
      batch.set(doc(db, 'activeStocks', id), {
        userId: 'u1', symbol: `S${index}`, name: `Stock ${index}`, currency: 'USD',
        buyPrice: 100, buyPriceAsOf: new Date(), addedAt: serverTimestamp(),
      });
      await assertSucceeds(batch.commit());
    }
    await assertFails(setDoc(doc(db, 'users', 'u1'), {
      activeStockIds: [...ids, 'u1__S10'],
    }, { merge: true }));
  });

  it('날짜별 방문 횟수는 한 번씩만 증가시킨다', async () => {
    const db = env.unauthenticatedContext().firestore();
    const trafficRef = doc(db, 'traffic', '2026-08-19');
    await assertSucceeds(setDoc(trafficRef, {
      date: '2026-08-19', views: 1, updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(setDoc(trafficRef, {
      views: increment(1), updatedAt: serverTimestamp(),
    }, { merge: true }));
    await assertFails(setDoc(trafficRef, {
      views: increment(2), updatedAt: serverTimestamp(),
    }, { merge: true }));
  });
});
