// Security rules tests. Run with: npx firebase-tools emulators:exec --only firestore --project demo-mongle "node --test tests/"
import { test, before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const D = '2026-10-26';
let env;
const db = uid => env.authenticatedContext(uid).firestore();

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({ projectId: 'demo-mongle', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host, port: +port } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'friendships/alice_bob'), { users: ['alice', 'bob'], createdAt: 1 });
    await setDoc(doc(f, 'users/alice/todos/t1'), { date: D, text: 'shared', shared: true, cat: 'c1', done: false });
    await setDoc(doc(f, 'users/alice/todos/t2'), { date: D, text: 'private', shared: false, cat: 'c2', done: false });
    await setDoc(doc(f, 'users/alice/meta/profile'), { settings: {} });
    await setDoc(doc(f, 'users/alice/days/' + D), { date: D, memo: 'secret' });
    await setDoc(doc(f, 'publicProfiles/alice'), { nickname: 'A', avatar: 'rabbit', code: 'MONG-AAAA', sharedCats: [] });
    await setDoc(doc(f, 'publicProfiles/carol'), { nickname: 'C', avatar: 'dog', code: 'MONG-CCCC', sharedCats: [] });
    await setDoc(doc(f, 'codes/MONG-AAAA'), { uid: 'alice' });
    await setDoc(doc(f, 'users/alice/reactions/t1_bob'), { todoId: 't1', from: 'bob', sticker: 'heart', date: D, text: 'shared', createdAt: 1, seen: false });
  });
});
const rx = (from, todoId, extra = {}) => ({ todoId, from, sticker: 'heart', date: D, text: 'x', createdAt: 2, seen: false, ...extra });

test('owner reads and writes own data', async () => {
  await assertSucceeds(getDoc(doc(db('alice'), 'users/alice/todos/t2')));
  await assertSucceeds(setDoc(doc(db('alice'), 'users/alice/todos/t3'), { date: D, text: 'new', shared: false }));
});
test('friend reads only shared todos', async () => {
  await assertSucceeds(getDoc(doc(db('bob'), 'users/alice/todos/t1')));
  await assertFails(getDoc(doc(db('bob'), 'users/alice/todos/t2')));
  await assertSucceeds(getDocs(query(collection(db('bob'), 'users/alice/todos'), where('date', '==', D), where('shared', '==', true))));
  await assertFails(getDocs(query(collection(db('bob'), 'users/alice/todos'), where('date', '==', D))));
});
test('non-friend and signed-out users read nothing', async () => {
  await assertFails(getDoc(doc(db('carol'), 'users/alice/todos/t1')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice/todos/t1')));
  await assertFails(getDoc(doc(db('carol'), 'publicProfiles/alice')));
});
test('friend cannot write todos or read private documents', async () => {
  await assertFails(setDoc(doc(db('bob'), 'users/alice/todos/t1'), { date: D, text: 'hacked', shared: true }));
  await assertFails(getDoc(doc(db('bob'), 'users/alice/meta/profile')));
  await assertFails(getDoc(doc(db('bob'), 'users/alice/days/' + D)));
});
test('reactions: friend can react only to shared todos as themself', async () => {
  await assertSucceeds(setDoc(doc(db('bob'), 'users/alice/reactions/t1_bob'), rx('bob', 't1', { sticker: 'fire' })));
  await assertFails(setDoc(doc(db('bob'), 'users/alice/reactions/t2_bob'), rx('bob', 't2')));
  await assertFails(setDoc(doc(db('carol'), 'users/alice/reactions/t1_carol'), rx('carol', 't1')));
  await assertFails(setDoc(doc(db('bob'), 'users/alice/reactions/t1_alice'), rx('alice', 't1')));
  await assertFails(setDoc(doc(db('bob'), 'users/alice/reactions/t1_bob'), rx('bob', 't1', { seen: true })));
  await assertFails(setDoc(doc(db('bob'), 'users/alice/reactions/t1_bob'), rx('bob', 't1', { extra: 1 })));
  await assertFails(setDoc(doc(db('bob'), 'users/alice/reactions/t1_bob'), rx('bob', 't1', { sticker: '<img src=x>' })));
  await assertSucceeds(getDocs(query(collection(db('bob'), 'users/alice/reactions'), where('from', '==', 'bob'), where('date', '==', D))));
  await assertSucceeds(deleteDoc(doc(db('bob'), 'users/alice/reactions/t1_bob')));
});
test('reactions: owner reads, marks seen, cannot rewrite', async () => {
  await assertSucceeds(getDocs(query(collection(db('alice'), 'users/alice/reactions'), where('date', '>=', D))));
  await assertSucceeds(updateDoc(doc(db('alice'), 'users/alice/reactions/t1_bob'), { seen: true }));
  await assertFails(updateDoc(doc(db('alice'), 'users/alice/reactions/t1_bob'), { sticker: 'angry' }));
});
test('public profiles', async () => {
  await assertSucceeds(getDoc(doc(db('bob'), 'publicProfiles/alice')));
  await assertSucceeds(setDoc(doc(db('bob'), 'publicProfiles/bob'), { nickname: 'B', avatar: 'penguin', code: 'MONG-BBBB', sharedCats: [] }));
  await assertFails(setDoc(doc(db('bob'), 'publicProfiles/alice'), { nickname: 'X' }, { merge: true }));
  await assertFails(setDoc(doc(db('bob'), 'publicProfiles/bob'), { nickname: 'B', admin: true }));
  await assertFails(setDoc(doc(db('bob'), 'publicProfiles/bob'), { nickname: 'B', avatar: '__proto__', code: 'MONG-BBBB', sharedCats: [] }));
});
test('friend codes', async () => {
  await assertSucceeds(getDoc(doc(db('carol'), 'codes/MONG-AAAA')));
  await assertFails(getDocs(collection(db('carol'), 'codes')));
  await assertFails(setDoc(doc(db('carol'), 'codes/MONG-AAAA'), { uid: 'carol' }));
  await assertFails(setDoc(doc(db('carol'), 'codes/MONG-ZZZZ'), { uid: 'alice' }));
  await assertSucceeds(setDoc(doc(db('carol'), 'codes/MONG-CCCC'), { uid: 'carol' }));
});
test('friend request and accept flow', async () => {
  await assertFails(setDoc(doc(db('carol'), 'friendRequests/bob_alice'), { from: 'bob', to: 'alice', createdAt: 1 }));
  await assertFails(setDoc(doc(db('alice'), 'friendships/alice_carol'), { users: ['alice', 'carol'], createdAt: 1 }));
  await assertSucceeds(setDoc(doc(db('carol'), 'friendRequests/carol_alice'), { from: 'carol', to: 'alice', createdAt: 1 }));
  await assertSucceeds(getDoc(doc(db('alice'), 'publicProfiles/carol')));
  await assertSucceeds(getDocs(query(collection(db('alice'), 'friendRequests'), where('to', '==', 'alice'))));
  await assertFails(getDocs(query(collection(db('bob'), 'friendRequests'), where('to', '==', 'alice'))));
  // requester cannot accept on the other person's behalf
  await assertFails(setDoc(doc(db('carol'), 'friendships/alice_carol'), { users: ['alice', 'carol'], createdAt: 1 }));
  await assertSucceeds(setDoc(doc(db('alice'), 'friendships/alice_carol'), { users: ['alice', 'carol'], createdAt: 1 }));
  await assertSucceeds(deleteDoc(doc(db('alice'), 'friendRequests/carol_alice')));
  await assertSucceeds(getDoc(doc(db('alice'), 'users/alice/todos/t1')));
  await assertSucceeds(getDoc(doc(db('carol'), 'users/alice/todos/t1')));
  await assertFails(deleteDoc(doc(db('bob'), 'friendships/alice_carol')));
  await assertSucceeds(deleteDoc(doc(db('carol'), 'friendships/alice_carol')));
  await assertFails(getDoc(doc(db('carol'), 'users/alice/todos/t1')));
});
