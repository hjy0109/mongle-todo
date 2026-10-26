// Local-only backend: used for demo mode and for testing without Firebase.
const KEY = 'mongle-local-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let mem = null;
const db = () => (mem ||= Object.assign({ profile: null, todos: {}, routines: {}, days: {} }, load()));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db())); } catch { /* storage unavailable */ } };

export function createLocalBackend() {
  let h = null;
  return {
    kind: 'local',
    onAuth(cb) { setTimeout(() => cb({ uid: 'local', email: '이 기기에만 저장' }), 0); return () => {}; },
    login: async () => {},
    resetPassword: async () => {},
    logout: async () => { localStorage.removeItem(KEY); mem = null; location.reload(); },
    start(uid, handlers) {
      h = handlers;
      const d = db();
      setTimeout(() => {
        h.profile(d.profile, false);
        const t = Object.entries(d.todos).map(([id, data]) => ({ type: 'added', id, data }));
        if (t.length) h.todos(t);
        const r = Object.entries(d.routines).map(([id, data]) => ({ type: 'added', id, data }));
        if (r.length) h.routines(r);
        const dy = Object.entries(d.days).map(([id, data]) => ({ type: 'added', id, data }));
        if (dy.length) h.days(dy);
        h.synced();
      }, 0);
      return () => { h = null; };
    },
    async loadRange() { return []; },
    social: { enabled: false },
    async saveProfile(p) { db().profile = JSON.parse(JSON.stringify({ ...(db().profile || {}), ...p })); save(); },
    async saveTodo(t) { db().todos[t.id] = t; save(); },
    async deleteTodo(id) { delete db().todos[id]; save(); },
    async saveRoutine(r) { db().routines[r.id] = r; save(); },
    async deleteRoutine(id) { delete db().routines[id]; save(); },
    async saveDay(date, p) { db().days[date] = { ...(db().days[date] || {}), ...p, date }; save(); },
    async fetchAll() { const d = db(); return { todos: Object.values(d.todos), routines: Object.values(d.routines), days: Object.values(d.days) }; },
    async restore(data) {
      const d = db();
      if (data.profile) d.profile = data.profile;
      (data.todos || []).forEach(t => (d.todos[t.id] = t));
      (data.routines || []).forEach(r => (d.routines[r.id] = r));
      (data.days || []).forEach(x => (d.days[x.date] = x));
      save(); location.reload();
    }
  };
}
