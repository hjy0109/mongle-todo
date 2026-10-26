import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, deleteDoc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

const clean = o => JSON.parse(JSON.stringify(o));

export function createFirebaseBackend(config) {
  const app = initializeApp(config);
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, {});
  }
  let uidNow = null;
  const ref = (...p) => doc(db, 'users', uidNow, ...p);
  const col = name => collection(db, 'users', uidNow, name);

  return {
    kind: 'firebase',
    onAuth(cb) { return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email } : null)); },
    login: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    resetPassword: email => sendPasswordResetEmail(auth, email),
    logout: () => signOut(auth),

    start(uid, h, { todoCutoff, dayCutoff }) {
      uidNow = uid;
      const unsubs = [];
      const pending = new Set(['todos', 'someday', 'routines', 'profile']);
      let syncedFired = false;
      const markSynced = (name, snap) => {
        if (!snap.metadata.fromCache) pending.delete(name);
        if (!syncedFired && pending.size === 0) { syncedFired = true; h.synced(); }
      };
      const changes = snap => snap.docChanges().map(c => ({ type: c.type, id: c.doc.id, data: c.doc.data() }));
      const opts = { includeMetadataChanges: true };
      unsubs.push(onSnapshot(ref('meta', 'profile'), opts, s => { h.profile(s.exists() ? s.data() : null, s.metadata.fromCache); markSynced('profile', s); }, h.error));
      unsubs.push(onSnapshot(query(col('todos'), where('date', '>=', todoCutoff)), opts, s => { const c = changes(s); if (c.length) h.todos(c); markSynced('todos', s); }, h.error));
      unsubs.push(onSnapshot(query(col('todos'), where('date', '==', '')), opts, s => { const c = changes(s); if (c.length) h.todos(c); markSynced('someday', s); }, h.error));
      unsubs.push(onSnapshot(col('routines'), opts, s => { const c = changes(s); if (c.length) h.routines(c); markSynced('routines', s); }, h.error));
      unsubs.push(onSnapshot(query(col('days'), where('date', '>=', dayCutoff)), opts, s => { const c = changes(s); if (c.length) h.days(c); }, h.error));
      return () => unsubs.forEach(u => u());
    },
    async loadRange(name, from, to) {
      const s = await getDocs(query(col(name), where('date', '>=', from), where('date', '<', to)));
      return s.docs.map(d => ({ id: d.id, data: d.data() }));
    },
    saveProfile: p => setDoc(ref('meta', 'profile'), clean(p), { merge: true }),
    saveTodo: t => setDoc(ref('todos', t.id), clean(t)),
    deleteTodo: id => deleteDoc(ref('todos', id)),
    saveRoutine: r => setDoc(ref('routines', r.id), clean(r)),
    deleteRoutine: id => deleteDoc(ref('routines', id)),
    saveDay: (date, p) => setDoc(ref('days', date), clean({ ...p, date }), { merge: true }),

    /* ---------- friends (shared Firestore collections) ---------- */
    social: {
      enabled: true,
      pairId: (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`),
      watchMine(h) {
        const me = uidNow, uns = [];
        uns.push(onSnapshot(doc(db, 'publicProfiles', me), s => h.publicProfile(s.exists() ? s.data() : null), h.error));
        uns.push(onSnapshot(query(collection(db, 'friendships'), where('users', 'array-contains', me)), s => h.friendships(s.docs.map(d => d.data().users.find(u => u !== me))), h.error));
        uns.push(onSnapshot(query(collection(db, 'friendRequests'), where('to', '==', me)), s => h.incoming(s.docs.map(d => d.data().from)), h.error));
        uns.push(onSnapshot(query(collection(db, 'friendRequests'), where('from', '==', me)), s => h.outgoing(s.docs.map(d => d.data().to)), h.error));
        uns.push(onSnapshot(query(col('reactions'), where('date', '>=', h.cutoff)), s => h.reactions(s.docs.map(d => ({ id: d.id, ...d.data() }))), h.error));
        return () => uns.forEach(u => u());
      },
      watchProfile(uid, cb, err) { return onSnapshot(doc(db, 'publicProfiles', uid), s => cb(s.exists() ? s.data() : null), err); },
      watchFriendDay(uid, date, cb, err) {
        const me = uidNow; let todos = null, rx = null;
        const emit = () => { if (todos && rx) cb({ todos, rx }); };
        const u1 = onSnapshot(query(collection(db, 'users', uid, 'todos'), where('date', '==', date), where('shared', '==', true)), s => { todos = s.docs.map(d => ({ id: d.id, ...d.data() })); emit(); }, err);
        const u2 = onSnapshot(query(collection(db, 'users', uid, 'reactions'), where('from', '==', me), where('date', '==', date)), s => { rx = s.docs.map(d => d.data()); emit(); }, err);
        return () => { u1(); u2(); };
      },
      savePublicProfile: p => setDoc(doc(db, 'publicProfiles', uidNow), clean(p), { merge: true }),
      async claimCode(code) { await setDoc(doc(db, 'codes', code), { uid: uidNow }); },
      async lookupCode(code) { const s = await getDoc(doc(db, 'codes', code)); return s.exists() ? s.data().uid : null; },
      sendRequest: to => setDoc(doc(db, 'friendRequests', `${uidNow}_${to}`), { from: uidNow, to, createdAt: Date.now() }),
      cancelRequest: to => deleteDoc(doc(db, 'friendRequests', `${uidNow}_${to}`)),
      declineRequest: from => deleteDoc(doc(db, 'friendRequests', `${from}_${uidNow}`)),
      async acceptRequest(from) {
        const users = [uidNow, from].sort();
        await setDoc(doc(db, 'friendships', users.join('_')), { users, createdAt: Date.now() });
        await deleteDoc(doc(db, 'friendRequests', `${from}_${uidNow}`));
      },
      removeFriend(uid) { return deleteDoc(doc(db, 'friendships', [uidNow, uid].sort().join('_'))); },
      react: (owner, todo, sticker) => setDoc(doc(db, 'users', owner, 'reactions', `${todo.id}_${uidNow}`),
        { todoId: todo.id, from: uidNow, sticker, date: todo.date, text: String(todo.text).slice(0, 80), createdAt: Date.now(), seen: false }),
      unreact: (owner, todoId) => deleteDoc(doc(db, 'users', owner, 'reactions', `${todoId}_${uidNow}`)),
      async markSeen(ids) {
        const b = writeBatch(db);
        ids.forEach(id => b.update(doc(db, 'users', uidNow, 'reactions', id), { seen: true }));
        await b.commit();
      },
      async shareBatch(todos) {
        for (let i = 0; i < todos.length; i += 400) {
          const b = writeBatch(db);
          todos.slice(i, i + 400).forEach(t => b.update(doc(db, 'users', uidNow, 'todos', t.id), { shared: t.shared }));
          await b.commit();
        }
      }
    },
    async fetchAll() {
      const out = {};
      for (const n of ['todos', 'routines', 'days']) out[n] = (await getDocs(col(n))).docs.map(d => d.data());
      return out;
    },
    async restore(data) {
      const writes = [];
      if (data.profile) writes.push([ref('meta', 'profile'), data.profile]);
      (data.todos || []).forEach(t => writes.push([ref('todos', t.id), t]));
      (data.routines || []).forEach(r => writes.push([ref('routines', r.id), r]));
      (data.days || []).forEach(d => writes.push([ref('days', d.date), d]));
      for (let i = 0; i < writes.length; i += 400) {
        const b = writeBatch(db);
        writes.slice(i, i + 400).forEach(([r, v]) => b.set(r, clean(v)));
        await b.commit();
      }
    }
  };
}
