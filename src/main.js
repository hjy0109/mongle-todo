import './style.css';
import { S, handlers, setRender, render, index, todosOn, cutoffs, toggleTodo, ensureRoutines, sharedCats } from './store.js';
import { renderAll, bindEvents, banner, handleBack, refreshNotif } from './ui.js';
import { themeOf, gardenOf } from './themes.js';
import { computeAlarms } from './logic.js';
import { todayKey, addKey, ddLabel, fmtT, debounce } from './util.js';
import { isNative, scheduleAlarms, pushWidget, takeWidgetPending, onResume, onBack, setBars } from './native.js';
import { firebaseConfig } from './config.js';
import { createLocalBackend } from './backend-local.js';

const CAT_HEX = { c1: '#FF9F8A', c2: '#5FC4A0', c3: '#7EA9F0', c4: '#EDBB45', c5: '#C59BEA', c6: '#F48FB8', c7: '#F2766B', c8: '#4DB6C4', c9: '#A8C55E', c10: '#B49A86' };
const darkMQ = matchMedia('(prefers-color-scheme: dark)');

let lastTheme = '';
function applyTheme() {
  const s = S.profile.settings, t = themeOf(s.theme), r = document.documentElement;
  const sig = s.theme + s.shape + darkMQ.matches;
  if (sig === lastTheme) return;
  lastTheme = sig;
  r.style.setProperty('--accent-l', t.l); r.style.setProperty('--accent-d', t.d); r.style.setProperty('--on-accent-l', t.on);
  if (s.shape === 'jelly') delete r.dataset.shape; else r.dataset.shape = s.shape;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', darkMQ.matches ? '#211D2A' : '#FFFFFF');
  setBars(darkMQ.matches);
}

const sideEffects = debounce(() => {
  if (!S.user || !S.synced) return;
  const idx = index();
  const pub = S.social.pub;
  if (pub && S.backend.social?.enabled && JSON.stringify(pub.sharedCats || []) !== JSON.stringify(sharedCats())) {
    pub.sharedCats = sharedCats();
    S.backend.social.savePublicProfile({ sharedCats: pub.sharedCats }).catch(e => console.warn(e));
  }
  scheduleAlarms(computeAlarms(S, idx), S.profile.settings.alarms.silent, a => banner(a.title, a.body));
  const TK = todayKey(), s = S.profile.settings, t = themeOf(s.theme), list = todosOn(TK);
  const dd = S.profile.ddays.filter(x => x.pin && x.date >= TK).sort((a, b) => a.date.localeCompare(b.date))[0];
  const cats = Object.fromEntries(S.profile.cats.map(c => [c.id, c]));
  pushWidget({
    date: TK, accent: t.l, title: `오늘 · ${+TK.slice(5, 7)}/${+TK.slice(8)}`,
    left: list.filter(x => !x.done).length,
    dday: dd ? `${ddLabel(dd.date)} ${dd.name}` : '',
    habits: `${(S.days[TK]?.habits || []).filter(id => S.profile.habits.some(h => h.id === id)).length}/${S.profile.habits.length}`,
    items: list.slice(0, 12).map(x => ({ id: x.id, text: x.text, done: !!x.done, time: x.time ? fmtT(x.time, s.h24) : '', color: CAT_HEX[cats[x.cat]?.color] || '#B49A86' }))
  });
}, 600);

setRender(() => { applyTheme(); syncDay(); renderAll(); sideEffects(); });

async function applyWidgetToggles() {
  const ids = await takeWidgetPending();
  ids.forEach(id => { if (S.todos[id]) toggleTodo(id); });
}


/* ---------- friends ---------- */
const PERM = '친구 기능을 쓰려면 Firebase 콘솔의 Firestore 규칙을 새 버전으로 바꿔야 해요.';
function startSocial(backend, uid, cutoff) {
  const so = S.social, B = backend.social;
  Object.assign(so, { pub: undefined, friends: [], incoming: [], outgoing: [], reactions: {}, profiles: {}, day: null, error: '' });
  const profs = new Map();
  const onErr = e => { console.warn(e); if (String(e?.code || '').includes('permission')) { so.error = PERM; render(); } };
  const syncProfiles = () => {
    const want = new Set([...so.friends, ...so.incoming, ...so.outgoing]);
    for (const [u, un] of profs) if (!want.has(u)) { un(); profs.delete(u); }
    for (const u of want) if (!profs.has(u)) profs.set(u, B.watchProfile(u, p => { if (p) so.profiles[u] = p; else delete so.profiles[u]; render(); }, e => console.warn(e)));
  };
  const stop = B.watchMine({
    cutoff,
    publicProfile: p => { so.pub = p; render(); },
    friendships: l => { so.friends = l.slice(0, 3); syncProfiles(); render(); },
    incoming: l => { so.incoming = l; syncProfiles(); render(); },
    outgoing: l => { so.outgoing = l; syncProfiles(); render(); },
    reactions: l => { so.reactions = Object.fromEntries(l.map(r => [r.id, r])); render(); },
    error: onErr
  });
  return () => { stop(); profs.forEach(u => u()); profs.clear(); stopDay(); };
}
let dayKey = null, dayUnsub = null;
function stopDay() { if (dayUnsub) dayUnsub(); dayUnsub = null; dayKey = null; }
function syncDay() {
  const so = S.social, B = S.backend?.social;
  let want = null;
  if (B?.enabled && S.user && S.ui.tab === 'friends' && so.friends.length) {
    const f = so.friends.includes(S.ui.friend) ? S.ui.friend : so.friends[0];
    want = `${f}|${S.ui.fdate || todayKey()}`;
  }
  if (want === dayKey) return;
  stopDay(); dayKey = want; so.day = null;
  if (!want) return;
  const [f, d] = want.split('|');
  dayUnsub = B.watchFriendDay(f, d, ({ todos, rx }) => { so.day = { key: want, todos, rx }; render(); },
    e => { console.warn(e); so.day = { key: want, todos: [], rx: [], error: '친구 할 일을 불러오지 못했어요. 잠시 후 다시 열어 주세요.' }; render(); });
}

let lastDay = todayKey();
async function boot() {
  let backend;
  const demo = new URLSearchParams(location.search).has('local') || !firebaseConfig?.apiKey;
  if (demo) backend = createLocalBackend();
  else { const { createFirebaseBackend } = await import('./backend-firebase.js'); backend = createFirebaseBackend(firebaseConfig); }
  S.backend = backend;
  bindEvents({ reschedule: () => render() });
  render();
  let stop = null, stopSocial = null;
  backend.onAuth(user => {
    if (stop) { stop(); stop = null; }
    if (stopSocial) { stopSocial(); stopSocial = null; }
    S.user = user; S.authReady = true; S.synced = false; S.todos = {}; S.routines = {}; S.days = {};
    if (user) {
      const c = cutoffs(); S.loadedFrom = c.todoCutoff; S.daysFrom = c.dayCutoff; S.allDays = false;
      stop = backend.start(user.uid, { ...handlers(), synced: (() => { const h = handlers().synced; return () => { h(); applyWidgetToggles(); }; })() }, c);
      if (backend.social?.enabled) stopSocial = startSocial(backend, user.uid, c.todoCutoff);
      refreshNotif();
    }
    render();
  });
  onResume(() => {
    if (todayKey() !== lastDay) { if (S.ui.selected === lastDay) S.ui.selected = todayKey(); lastDay = todayKey(); ensureRoutines(todayKey(), addKey(todayKey(), 21)); }
    if (S.synced) applyWidgetToggles();
    refreshNotif();
    render();
  });
  onBack(handleBack);
  darkMQ.addEventListener('change', render);
  setInterval(() => { if (todayKey() !== lastDay) { if (S.ui.selected === lastDay) S.ui.selected = todayKey(); lastDay = todayKey(); ensureRoutines(todayKey(), addKey(todayKey(), 21)); render(); } }, 60000);
  if (!isNative && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}
window.__mongle = S;
boot();
