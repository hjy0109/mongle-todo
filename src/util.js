export const pad = n => String(n).padStart(2, '0');
export const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addKey = (k, n) => key(addDays(fromKey(k), n));
export const todayKey = () => key(new Date());
export const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const fmtDay = k => { const d = fromKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; };
export const fmtShort = k => { const d = fromKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const rnd = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
export const hash32 = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 1) || 1; };
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5);
export const ddLabel = k => { const n = daysBetween(todayKey(), k); return n > 0 ? `D-${n}` : n === 0 ? 'D-day' : `D+${-n}`; };
export function fmtT(t, h24) {
  if (!t) return '';
  if (h24) return t;
  const [h, m] = t.split(':').map(Number);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(m)}`;
}
export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
