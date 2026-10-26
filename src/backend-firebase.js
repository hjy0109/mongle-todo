import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

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
