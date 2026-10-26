import { uid, todayKey, addKey, key, addDays, debounce } from './util.js';
import { buildIndex, missingRoutineTodos } from './logic.js';

export const DEFAULT_PROFILE = () => ({
  settings: {
    theme: 'lilac', garden: 'auto', shape: 'jelly', h24: true, weekStart: 0, showBook: true,
    alarms: { morning: { on: true, time: '08:30' }, evening: { on: false, time: '21:30' }, silent: true }
  },
  cats: [
    { id: 'c-research', name: '연구', color: 'c3' }, { id: 'c-lab', name: '랩 업무', color: 'c5' },
    { id: 'c-health', name: '건강', color: 'c2' }, { id: 'c-personal', name: '개인', color: 'c1' }
  ],
  habits: [{ id: 'h-water', name: '물 2L 마시기' }, { id: 'h-stretch', name: '스트레칭 10분' }, { id: 'h-read', name: '독서 30분' }],
  ddays: [],
  book: null,
  share: []
});

export const S = {
  backend: null, user: null, authReady: false, synced: false, error: '',
  profile: DEFAULT_PROFILE(), profileLoaded: false,
  todos: {}, routines: {}, days: {},
  loadedFrom: null, // earliest date (key) whose todos are loaded
  social: { pub: undefined, friends: [], incoming: [], outgoing: [], reactions: {}, profiles: {}, day: null },
  ui: {}
};

let renderFn = () => {};
export const setRender = fn => { renderFn = fn; };
let rq = false;
export function render() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; idx = null; renderFn(); }); }
let idx = null;
export const index = () => (idx ||= buildIndex(S.todos));
export const todosOn = k => index().get(k) || [];

/* ---------- sync handlers ---------- */
const applyChanges = (target, changes) => changes.forEach(c => { if (c.type === 'removed') delete target[c.id]; else target[c.id] = c.data; });
export function handlers() {
  return {
    profile(p) {
      if (p) {
        const d = DEFAULT_PROFILE();
        S.profile = { ...d, ...p, settings: { ...d.settings, ...(p.settings || {}), alarms: { ...d.settings.alarms, ...(p.settings?.alarms || {}) } } };
        S.profileLoaded = true;
      }
      render();
    },
    todos(c) { applyChanges(S.todos, c); idx = null; render(); },
    routines(c) { applyChanges(S.routines, c); render(); },
    days(c) { applyChanges(S.days, c); render(); },
    synced() {
      S.synced = true;
      if (!S.profileLoaded) { S.profileLoaded = true; S.backend.saveProfile(S.profile); }
      ensureRoutines(todayKey(), addKey(todayKey(), 21));
      render();
    },
    error(e) { console.error(e); S.error = '서버와 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'; render(); }
  };
}

/* ---------- writes ---------- */
const B = () => S.backend;
const safe = p => Promise.resolve(p).catch(e => { console.error(e); S.error = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'; render(); });

export function saveProfile(patch) { Object.assign(S.profile, patch); render(); safe(B().saveProfile(patch)); }
export function saveSettings(patch) { S.profile.settings = { ...S.profile.settings, ...patch }; render(); safe(B().saveProfile({ settings: S.profile.settings })); }
export const isShared = t => !!t.date && (S.profile.share || []).includes(t.cat);
export function putTodo(t) { t = { ...t, shared: isShared(t) }; S.todos[t.id] = t; idx = null; render(); safe(B().saveTodo(t)); }
export function removeTodo(id) { delete S.todos[id]; idx = null; render(); safe(B().deleteTodo(id)); }
export function putRoutine(r) { S.routines[r.id] = r; render(); safe(B().saveRoutine(r)); }
export function putDay(date, patch) { S.days[date] = { ...(S.days[date] || { date }), ...patch, date }; render(); safe(B().saveDay(date, patch)); }

/* ---------- todo actions ---------- */
export function addTodo(date, cat, text) {
  const t = { id: uid(), date, cat, text, done: false, time: '', subs: [], routineId: null, order: Date.now() };
  putTodo(t); return t;
}
export function toggleTodo(id) { const t = S.todos[id]; if (!t) return; putTodo({ ...t, done: !t.done, doneAt: !t.done ? Date.now() : null }); }
export function updateTodo(id, patch, { future = false } = {}) {
  const t = S.todos[id]; if (!t) return;
  putTodo({ ...t, ...patch });
  if (future && t.routineId && S.routines[t.routineId]) {
    const r = S.routines[t.routineId], rp = {};
    if ('text' in patch) rp.text = patch.text;
    if ('time' in patch) rp.time = patch.time;
    if ('cat' in patch) rp.cat = patch.cat;
    putRoutine({ ...r, ...rp });
    Object.values(S.todos).filter(x => x.routineId === r.id && x.date > t.date && !x.done).forEach(x => putTodo({ ...x, ...rp }));
  }
}
export function deleteTodo(id) {
  const t = S.todos[id]; if (!t) return;
  if (t.routineId && S.routines[t.routineId]) { const r = S.routines[t.routineId]; putRoutine({ ...r, skips: [...new Set([...(r.skips || []), t.date])] }); }
  removeTodo(id);
}
export function moveTodo(id, date) {
  const t = S.todos[id]; if (!t || t.date === date) return;
  if (t.routineId && S.routines[t.routineId]) { const r = S.routines[t.routineId]; putRoutine({ ...r, skips: [...new Set([...(r.skips || []), t.date])] }); }
  const nt = { ...t, date, routineId: null, order: Date.now() };
  if (t.id.startsWith('r-')) { removeTodo(t.id); nt.id = uid(); }
  putTodo(nt);
  return nt.id;
}
function endRoutine(r, fromDate) {
  putRoutine({ ...r, until: addKey(fromDate, -1) });
  Object.values(S.todos).filter(x => x.routineId === r.id && x.date > fromDate && !x.done).forEach(x => removeTodo(x.id));
}
export function setRepeat(id, rule) {
  const t = S.todos[id]; if (!t || !t.date) return;
  const old = t.routineId && S.routines[t.routineId];
  if (old && old.rule === rule) return;
  if (old) endRoutine(old, t.date);
  if (!rule) { putTodo({ ...t, routineId: null }); return; }
  const r = { id: uid(), cat: t.cat, text: t.text, time: t.time || '', rule, start: t.date, until: null, skips: [], subs: (t.subs || []).map(s => s.text), order: (t.order || 0) % 864e5 };
  putRoutine(r);
  putTodo({ ...t, routineId: r.id });
  idx = null;
  ensureRoutines(t.date, addKey(todayKey(), 21));
}
export function ensureRoutines(from, to) {
  if (!S.synced) return;
  const t0 = todayKey();
  if (from < t0) from = t0;
  if (to < from) return;
  missingRoutineTodos(S.routines, index(), from, to).forEach(t => { t.shared = isShared(t); S.todos[t.id] = t; safe(B().saveTodo(t)); });
  idx = null;
}

/* ---------- habits ---------- */
export function toggleHabit(date, hid) {
  const cur = new Set(S.days[date]?.habits || []);
  cur.has(hid) ? cur.delete(hid) : cur.add(hid);
  putDay(date, { habits: [...cur] });
}

/* ---------- older history ---------- */
export async function ensureLoaded(fromDate) {
  if (!S.loadedFrom || fromDate >= S.loadedFrom || S.loading) return;
  S.loading = true;
  try {
    const [t, d] = await Promise.all([B().loadRange('todos', fromDate, S.loadedFrom), B().loadRange('days', fromDate, S.loadedFrom)]);
    t.forEach(x => { S.todos[x.id] = x.data; });
    d.forEach(x => { S.days[x.id] = x.data; });
    S.loadedFrom = fromDate;
  } catch (e) { console.error(e); }
  S.loading = false; idx = null; render();
}
export const cutoffs = () => ({ todoCutoff: key(addDays(new Date(), -70)), dayCutoff: key(addDays(new Date(), -230)) });

export const later = debounce(fn => fn(), 400);

/* ---------- sharing with friends ---------- */
export function setShare(catId, on) {
  const share = new Set(S.profile.share || []);
  on ? share.add(catId) : share.delete(catId);
  saveProfile({ share: [...share] });
  const changed = Object.values(S.todos).filter(t => t.cat === catId && t.date && t.shared !== on).map(t => ({ ...t, shared: on }));
  changed.forEach(t => { S.todos[t.id] = t; });
  idx = null; render();
  if (changed.length && B().social?.enabled) safe(B().social.shareBatch(changed));
}
export const sharedCats = () => S.profile.cats.filter(c => (S.profile.share || []).includes(c.id)).map(c => ({ id: c.id, name: c.name, color: c.color }));
export const unseenReactions = () => Object.values(S.social.reactions).filter(r => !r.seen && S.social.friends.includes(r.from));
