import { key, fromKey, addDays, addKey, todayKey, rnd, fmtT } from './util.js';

export const REPEATS = [['', '안 함'], ['daily', '매일'], ['weekdays', '평일'], ['weekly', '매주']];
export const repName = r => (REPEATS.find(x => x[0] === r) || ['', ''])[1];

export function buildIndex(todos) {
  const byDate = new Map();
  for (const t of Object.values(todos)) {
    if (!byDate.has(t.date)) byDate.set(t.date, []);
    byDate.get(t.date).push(t);
  }
  for (const a of byDate.values()) a.sort((x, y) => (x.order || 0) - (y.order || 0));
  return byDate;
}

export function ruleMatches(r, k) {
  if (k < r.start) return false;
  if (r.until && k > r.until) return false;
  if ((r.skips || []).includes(k)) return false;
  const d = fromKey(k), w = d.getDay();
  if (r.rule === 'daily') return true;
  if (r.rule === 'weekdays') return w > 0 && w < 6;
  if (r.rule === 'weekly') return w === fromKey(r.start).getDay();
  return false;
}

// Returns todo objects that should exist for routines in [from, to] but don't yet.
export function missingRoutineTodos(routines, index, from, to) {
  const out = [];
  for (const r of Object.values(routines)) {
    for (let k = from; k <= to; k = addKey(k, 1)) {
      if (!ruleMatches(r, k)) continue;
      const list = index.get(k) || [];
      if (list.some(t => t.routineId === r.id)) continue;
      out.push({
        id: `r-${r.id}-${k}`, date: k, cat: r.cat, text: r.text, time: r.time || '', done: false,
        subs: (r.subs || []).map((s, i) => ({ id: `s${i}`, text: s, done: false })), routineId: r.id,
        order: fromKey(k).getTime() + (r.order || 0)
      });
    }
  }
  return out;
}

export function computeAlarms(S, index, horizonDays = 7) {
  const now = Date.now(), out = [], st = S.profile.settings, h24 = st.h24;
  const t0 = todayKey();
  for (let i = 0; i <= horizonDays; i++) {
    const k = addKey(t0, i), list = index.get(k) || [];
    const at = time => { const [h, m] = time.split(':').map(Number); const d = fromKey(k); d.setHours(h, m, 0, 0); return d; };
    for (const t of list) {
      if (!t.time || t.done) continue;
      const when = at(t.time);
      if (when.getTime() > now) out.push({ key: `t:${t.id}:${k}:${t.time}`, at: when, title: `${fmtT(t.time, h24)} · ${t.text}`, body: '할 시간이에요', kind: 'todo' });
    }
    const left = list.filter(t => !t.done);
    if (st.alarms.morning.on && st.alarms.morning.time) {
      const when = at(st.alarms.morning.time);
      if (when.getTime() > now) out.push({ key: `m:${k}`, at: when, kind: 'brief',
        title: left.length ? `좋은 아침이에요, 오늘 할 일 ${left.length}개` : '좋은 아침이에요',
        body: left.length ? left.slice(0, 4).map(t => t.text).join(' · ') + (left.length > 4 ? ` 외 ${left.length - 4}개` : '') : '오늘은 등록된 할 일이 없어요' });
    }
    if (st.alarms.evening.on && st.alarms.evening.time) {
      const when = at(st.alarms.evening.time);
      if (when.getTime() > now) out.push({ key: `e:${k}`, at: when, kind: 'check',
        title: '오늘 하루 체크', body: i === 0 ? (left.length ? `아직 남은 할 일 ${left.length}개: ${left.slice(0, 3).map(t => t.text).join(' · ')}` : '오늘 할 일을 모두 끝냈어요') : '남은 할 일을 확인해 보세요' });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/* ---- habits ---- */
export const habitsOn = (S, k) => (S.days[k]?.habits || []).filter(id => S.profile.habits.some(h => h.id === id));
export function isSpecial(S, k) {
  const n = habitsOn(S, k).length, total = S.profile.habits.length, r = rnd(k + 'sp');
  if (!total) return false;
  return (n === total && r < 0.3) || (n >= 2 && r < 0.04);
}
export function habitStreak(S, id) {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const k = key(addDays(new Date(), -i));
    const ok = (S.days[k]?.habits || []).includes(id);
    if (i === 0 && !ok) continue;
    if (ok) n++; else break;
  }
  return n;
}
