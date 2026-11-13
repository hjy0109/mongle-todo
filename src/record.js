// 기록 tab: block picker, reading (shelf + book page extras + Kakao search) and mood blocks.
import { CapacitorHttp } from '@capacitor/core';
import { S, saveProfile, saveSettings, putDay, loadAllDays } from './store.js';
import { esc, key, fromKey, addKey, todayKey, uid, hash32, WD } from './util.js';
import { isNative } from './native.js';

const U = S.ui;
const P = () => S.profile;
const st = () => S.profile.settings;
let ctx = { toast: () => {}, render: () => {}, armed: () => false };
export const initRecord = c => {
  ctx = c;
  // web fonts can arrive after the first measurement; measure the spine titles again when they do
  try { document.fonts?.ready.then(() => fitSpines(true)); document.fonts?.addEventListener?.('loadingdone', () => fitSpines(true)); } catch { /* ignore */ }
};

/* ---------------- blocks ---------------- */
export const BLOCKS = [
  { id: 'habit', name: '습관 트래커', desc: '매일 체크하면 정원이 자라요' },
  { id: 'read', name: '독서', desc: '읽는 중인 책, 메모, 내 책장' },
  { id: 'mood', name: '기분', desc: '오늘의 기분, 한 줄 일기, 기분 달력' }
];
export const blocksOf = () => {
  const b = st().blocks;
  if (Array.isArray(b) && b.length) return b.filter(x => BLOCKS.some(y => y.id === x)).slice(0, 2);
  return st().showBook === false ? ['habit'] : ['habit', 'read'];
};
const BICON = {
  habit: '<svg viewBox="0 0 24 24" fill="none" stroke="#3E9E72" stroke-width="2.2" stroke-linecap="round"><path d="M12 21V11"/><path d="M12 13c-4 0-6-3-6-6 3 0 6 2 6 6z" fill="#A8DDA0"/><path d="M12 11c0-4 3-6 6-6 0 3-2 6-6 6z" fill="#A8DDA0"/></svg>',
  read: '<svg viewBox="0 0 24 24" fill="none" stroke="#5C86C9" stroke-width="2" stroke-linejoin="round"><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" fill="#D8E6FB"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" fill="#D8E6FB"/></svg>',
  mood: '<svg viewBox="0 0 24 24"><circle cx="9" cy="10" r="5.5" fill="#FFD36E"/><circle cx="15" cy="14" r="5.5" fill="#F7A6C4" opacity=".9"/></svg>'
};
export function blocksSettingHTML() {
  const picked = blocksOf();
  return `<div class="card stack"><div class="row"><div><div class="lbl">기록 탭 구성</div><div class="sub">기록 탭에 보일 블록을 2개까지 골라요. 숫자는 보이는 순서예요.</div></div><span class="sub">${picked.length} / 2</span></div>
    ${BLOCKS.map(b => { const i = picked.indexOf(b.id), dim = picked.length >= 2 && i < 0;
      return `<button class="blkrow${dim ? ' dim' : ''}" data-act="blkToggle" data-v="${b.id}"><span class="blkic">${BICON[b.id]}</span><span class="blktx"><b>${b.name}</b><span class="sub">${b.desc}</span></span><span class="blkchk${i >= 0 ? ' on' : ''}">${i >= 0 ? i + 1 : ''}</span></button>`; }).join('')}
    ${picked.length > 1 ? '<button class="btn ghost sm" data-act="blkSwap" style="align-self:stretch">↕ 순서 바꾸기</button>' : ''}
    <div class="sub">블록을 빼도 기록은 지워지지 않아요. 다시 켜면 그대로 나와요.</div></div>`;
}

/* ---------------- books ---------------- */
export const books = () => P().books || (P().book ? [{ id: 'b0', ...P().book }] : []);
const SPINE = ['#3F6FA8', '#E9A6A1', '#5E9E62', '#2F3A5C', '#F2B84B', '#B79CE0', '#3E8E9C', '#8C5E3C', '#7D8AA6', '#D9534F', '#2E7D6B', '#C8A15A'];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const spineColor = b => (/^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : SPINE[hash32(b.title || b.id) % SPINE.length]);
const spineW = b => Math.max(20, Math.min(40, Math.round((+b.total || 200) / 10)));
const spineH = b => 112 + hash32((b.title || '') + 'h') % 34;
const firstLog = bid => { let m = ''; for (const d of Object.values(S.days)) if ((d.reading?.[bid] || (d.bnotes?.[bid] || '').trim()) && (!m || d.date < m)) m = d.date; return m; };
export const bookStart = b => b.startDate || (b.createdAt ? key(new Date(b.createdAt)) : firstLog(b.id));
export const bookEnd = b => b.endDate || (b.done && b.doneAt ? key(new Date(b.doneAt)) : '');
// fit a vertical title: shrink the font down to 8px, then cut with an ellipsis
const emOf = ch => (/\s/.test(ch) ? 0.4 : /[\u3131-\uD7A3\u4E00-\u9FFF]/.test(ch) ? 1.05 : 0.7);
function fitTitle(title, room) {
  const t = String(title || ''), em = [...t].reduce((n, ch) => n + emOf(ch), 0) || 1;
  const fs = Math.max(8, Math.min(11, Math.floor(room / em)));
  if (em * fs <= room) return { fs, text: t };
  let out = '', used = 1.05; for (const ch of t) { if ((used + emOf(ch)) * 8 > room) break; out += ch; used += emOf(ch); }
  return { fs: 8, text: out.trimEnd() + '…' };
}
function spineHTML(b, extra = '') {
  const c = spineColor(b), w = spineW(b), h = spineH(b), ft = fitTitle(b.title, h - 32);
  return `<span class="spw"><span class="sp${extra}" data-act="journal" data-id="${esc(b.id)}" style="width:${w}px;height:${h}px;background:${c};color:${lum(c) > 0.62 ? '#3A3046' : '#fff'}" title="${esc(b.title)}">${b.done ? '' : '<i class="rib"></i>'}<b style="font-size:${ft.fs}px" data-t="${esc(b.title)}">${esc(b.title)}</b></span></span>`;
}
export function shelfOrder() {
  const all = books(), has = all.some(b => typeof b.shelf === 'number');
  const dflt = b => (b.done ? bookEnd(b) : bookStart(b)) || '';
  return [...all].sort((a, b) => {
    if (has) { const x = typeof a.shelf === 'number' ? a.shelf : 1e9, y = typeof b.shelf === 'number' ? b.shelf : 1e9; if (x !== y) return x - y; }
    return dflt(b).localeCompare(dflt(a)) || (b.doneAt || 0) - (a.doneAt || 0);
  });
}
// a book that just finished (or was just added) goes to the front if the shelf has a custom order
export const frontShelf = () => { const n = books().filter(b => typeof b.shelf === 'number').map(b => b.shelf); return n.length ? Math.min(...n) - 10 : undefined; };

function readingCard(b) {
  const pct = Math.round(b.page / b.total * 100), notes = bookNoteCount(b.id);
  return `<div class="rcard"><span class="minisp" style="background:${spineColor(b)}" data-act="journal" data-id="${esc(b.id)}"><i class="rib"></i></span>
    <div class="rcb"><button class="rct" data-act="journal" data-id="${esc(b.id)}">${esc(b.title)}</button>
      <div class="sub">p.${b.page} / ${b.total} · ${pct}%</div><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div>
      <div class="rbtns"><button data-act="book" data-id="${esc(b.id)}" data-v="-10">－10</button><button data-act="book" data-id="${esc(b.id)}" data-v="10">＋10</button><button class="rmemo" data-act="journal" data-id="${esc(b.id)}">메모${notes ? ' ' + notes : ''}</button></div></div></div>`;
}
export const bookNoteCount = bid => Object.values(S.days).filter(d => d.bnotes && (d.bnotes[bid] || '').trim()).length;

export function readBlock() {
  const all = books(), reading = all.filter(b => !b.done).sort((a, b) => (bookStart(b) || '').localeCompare(bookStart(a) || ''));
  const shelf = shelfOrder();
  let h = `<div class="card stack rblock"><div class="row"><span class="lbl b">독서</span><button class="btn ghost sm" data-act="bkAdd">＋ 책 추가</button></div>`;
  if (reading.length) h += `<div class="sub b2">읽는 중 ${reading.length}권</div><div class="rlist">${reading.map(readingCard).join('')}</div>`;
  else h += '<div class="sub">읽고 있는 책을 추가해 보세요.</div>';
  if (shelf.length) {
    h += `<div class="sub b2">책장 · 최근 두 칸</div><div class="shelfbox"><div class="shelf prev">${shelf.map(b => spineHTML(b)).join('')}</div></div>
      <button class="foldbtn" data-act="shelfOpen">전체 책장 보기 · ${shelf.length}권</button>`;
  }
  return h + '</div>';
}

// after rendering: measure each spine title and shrink / cut the ones that still overflow
export function fitSpines(again = false) {
  if (again) document.querySelectorAll('b[data-fit]').forEach(el => { el.removeAttribute('data-fit'); el.textContent = el.dataset.t; el.style.fontSize = el.dataset.fs; });
  document.querySelectorAll('.sp b[data-t]:not([data-fit]), .bigsp b[data-t]:not([data-fit])').forEach(el => {
    el.dataset.fit = '1'; if (!el.dataset.fs) el.dataset.fs = el.style.fontSize;
    const room = el.parentElement.clientHeight - (el.closest('.bigsp') ? 20 : 38);
    const tall = () => el.getBoundingClientRect().height;
    if (room <= 0 || tall() <= room) return;
    let fs = parseFloat(el.style.fontSize) || 11;
    while (fs > 8 && tall() > room) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
    if (tall() <= room) return;
    const full = [...el.dataset.t]; let n = full.length;
    while (n > 1 && tall() > room) { n--; el.textContent = full.slice(0, n).join('').trimEnd() + '⋯'; }
  });
}

/* ---------- full shelf page ---------- */
export function shelfPageHTML(wide) {
  const q = (U.shelfQ || '').trim().toLowerCase(), list = shelfOrder().filter(b => !q || (b.title + ' ' + (b.author || '')).toLowerCase().includes(q));
  const asList = U.shelfView === 'list', edit = U.shelfEdit && !asList && !q;
  const body = !list.length ? `<div class="sub" style="text-align:center;padding:30px 0">${q ? '찾는 책이 없어요' : '아직 책이 없어요'}</div>`
    : asList ? `<div class="blist">${list.map(b => `<button class="bli" data-act="journal" data-id="${esc(b.id)}"><span class="minisp sm" style="background:${spineColor(b)}"></span><span class="blt"><b>${esc(b.title)}</b><span class="sub">${b.author ? esc(b.author) + ' · ' : ''}${b.done ? `다 읽음 ${bookEnd(b) ? fmtDot(bookEnd(b)) : ''}` : `읽는 중 p.${b.page}/${b.total}`}</span></span><span class="sub">${bookNoteCount(b.id) ? '메모 ' + bookNoteCount(b.id) : ''}</span></button>`).join('')}</div>`
    : `<div class="shelfbox"><div class="shelf${edit ? ' edit' : ''}" id="fullshelf">${list.map(b => spineHTML(b)).join('')}</div></div>`;
  return `<div class="jpage${wide ? ' wide' : ''}" role="dialog" aria-label="내 책장"><div class="jbox">
    <div class="pghd"><button class="back" data-act="shelfClose" aria-label="뒤로">‹</button><div class="t"><b>내 책장</b><span class="sub">${books().length}권 · 다 읽은 책 ${books().filter(b => b.done).length}권</span></div>
      ${asList || q ? '' : `<button class="btn ${edit ? '' : 'ghost '}sm" data-act="shelfEdit">${edit ? '완료' : '정리하기'}</button>`}</div>
    <div class="pgbody"><div class="shelftools"><input id="shelfq" class="field" placeholder="제목이나 지은이로 찾기" value="${esc(U.shelfQ || '')}" autocomplete="off"><div class="seg"><button class="${asList ? '' : 'on'}" data-act="shelfView" data-v="shelf">책장</button><button class="${asList ? 'on' : ''}" data-act="shelfView" data-v="list">목록</button></div></div>
      <div class="sub" style="margin:2px 2px 10px">${edit ? '책을 끌어서 다른 책 앞에 놓으면 자리가 바뀌어요.' : asList ? '책을 누르면 기록이 열려요.' : '책등을 누르면 그 책의 기록이 열려요.'}</div>${body}</div></div></div>`;
}
export function bindShelfDrag() {
  let d = null;
  document.addEventListener('pointerdown', e => {
    const sp = e.target.closest('#fullshelf.edit .sp'); if (!sp) return;
    e.preventDefault(); d = { id: sp.dataset.id, el: sp, tgt: null, moved: false }; sp.classList.add('lift');
    try { sp.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, true);
  document.addEventListener('pointermove', e => {
    if (!d) return; d.moved = true;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('#fullshelf .sp');
    document.querySelectorAll('#fullshelf .sp.tgt').forEach(x => x.classList.remove('tgt'));
    if (el && el !== d.el) { el.classList.add('tgt'); d.tgt = el.dataset.id; } else d.tgt = null;
    const pb = d.el.closest('.pgbody'); if (pb) { const r = pb.getBoundingClientRect(); if (e.clientY > r.bottom - 50) pb.scrollTop += 10; else if (e.clientY < r.top + 50) pb.scrollTop -= 10; }
  });
  const end = () => {
    if (!d) return; const { id, tgt } = d; d.el.classList.remove('lift'); d = null; U.dragShelf = true;
    if (tgt && tgt !== id) {
      const order = shelfOrder().map(b => b.id).filter(x => x !== id); order.splice(order.indexOf(tgt), 0, id);
      saveProfile({ books: books().map(b => ({ ...b, shelf: order.indexOf(b.id) * 10 })), book: null });
    } else ctx.render();
    setTimeout(() => { U.dragShelf = false; }, 50);
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}

/* ---------- book page extras (inside the reading journal page) ---------- */
const fmtDot = k => { const d = fromKey(k); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };
const spanDays = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5) + 1;
export function bookInfoHTML(b) {
  const TK = todayKey(), s = bookStart(b), e = bookEnd(b), pct = Math.round(b.page / b.total * 100);
  const logged = new Set(Object.values(S.days).filter(d => (d.reading && d.reading[b.id]) || (d.bnotes && (d.bnotes[b.id] || '').trim())).map(d => d.date));
  const span = s ? spanDays(s, b.done && e ? e : TK) : 0;
  const pages = Object.values(S.days).reduce((n, d) => { const r = d.reading?.[b.id]; return n + (r ? Math.max(0, r[1] - r[0]) : 0); }, 0);
  const days = Object.values(S.days).filter(d => d.reading?.[b.id]).length, avg = days ? Math.round(pages / days) : 0;
  const rounds = b.rounds || [];
  if (U.bookEdit === b.id) return bookEditHTML(b);
  return `<div class="binfo2">
    <div class="bi-top"><span class="bigsp" style="background:${spineColor(b)};color:${lum(spineColor(b)) > 0.62 ? '#3A3046' : '#fff'}">${b.done ? '' : '<i class="rib"></i>'}${(() => { const ft = fitTitle(b.title, 76); return `<b style="font-size:${ft.fs}px" data-t="${esc(b.title)}">${esc(b.title)}</b>`; })()}</span>
      <div class="bi-t"><div class="tt">${esc(b.title)}</div>${b.author || b.publisher ? `<div class="sub">${esc([b.author, b.publisher].filter(Boolean).join(' · '))}</div>` : ''}
      <span class="bbadge${b.done ? ' done' : ''}">${b.done ? (rounds.length ? `${rounds.length + 1}회차 다 읽음` : '다 읽음') : `읽는 중${span ? ` · ${span}일째` : ''}`}</span></div>
      <button class="more" data-act="bookEdit" data-id="${esc(b.id)}" aria-label="책 정보 고치기">⋯</button></div>
    <div class="row sub" style="margin-top:10px"><span>p.${b.page} / ${b.total}</span><span>${pct}%</span></div><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div>
    <div class="period"><button data-act="dpOpen" data-v="start"><span class="sub">시작한 날</span><b>${s ? fmtDot(s) : '정하기'}</b></button><span class="arr">→</span><button data-act="dpOpen" data-v="end" class="${b.done ? '' : 'wait'}"><span class="sub">다 읽은 날</span><b>${b.done ? (e ? fmtDot(e) : '정하기') : '읽는 중'}</b></button></div>
    <div class="bstats"><div><b>${span ? span + '일' : '-'}</b><span class="sub">${b.done ? '걸린 기간' : '읽은 기간'}</span></div><div><b>${logged.size}일</b><span class="sub">기록한 날</span></div><div><b>${avg ? avg + '쪽' : '-'}</b><span class="sub">하루 평균</span></div></div>
    ${rounds.length ? `<div class="sub" style="margin-top:8px">이전 회차: ${rounds.map((r, i) => `${i + 1}회차 ${r[0] ? fmtDot(r[0]) : '?'} → ${r[1] ? fmtDot(r[1]) : '?'}`).join(' · ')}</div>` : ''}
    <div class="bacts">${b.done ? '<button data-act="bookReopen" data-id="' + esc(b.id) + '">다시 읽기</button>' : `<button data-act="bookEdit" data-id="${esc(b.id)}">쪽수 고치기</button><button data-act="bookFinish" data-id="${esc(b.id)}">다 읽음으로 표시</button>`}</div>
  </div>`;
}
function bookEditHTML(b) {
  return `<div class="binfo2 stack"><b>책 정보 고치기</b><div class="bookform"><label class="full">책 제목<input class="field" id="bk-title" value="${esc(b.title)}" autocomplete="off"></label>
    <label class="full">지은이<input class="field" id="bk-author" value="${esc(b.author || '')}" autocomplete="off"></label>
    <label>지금 쪽<input class="field" id="bk-page" type="number" inputmode="numeric" min="0" value="${b.page ?? 0}"></label>
    <label>전체 쪽<input class="field" id="bk-total" type="number" inputmode="numeric" min="1" value="${b.total || ''}"></label></div>
    <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn danger sm" data-act="bookDel" data-id="${esc(b.id)}">${ctx.armed('bdel:' + b.id) ? '한 번 더 누르면 지워져요' : '책 지우기'}</button><button class="btn ghost sm" data-act="bookEdit" data-id="">취소</button><button class="btn sm" data-act="bookSave" data-id="${esc(b.id)}">저장</button></div></div>`;
}
export const entryBadges = (b, k) => (k === bookStart(b) ? '<span class="ebadge st">시작</span>' : '') + (b.done && k === bookEnd(b) ? '<span class="ebadge fin">다 읽음</span>' : '');

/* ---------- date picker (typed or calendar) ---------- */
export function parseTyped(v) {
  v = String(v).trim().replace(/\s/g, '');
  let m = v.match(/^(\d{4})[.\-/년]?(\d{1,2})[.\-/월]?(\d{1,2})일?\.?$/);
  if (!m && /^\d{8}$/.test(v)) m = [0, v.slice(0, 4), v.slice(4, 6), v.slice(6)];
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, dd = +m[3], x = new Date(y, mo, dd);
  if (y < 1900 || x.getMonth() !== mo || x.getDate() !== dd) return null;
  return key(x);
}
export function datePickerHTML() {
  const dp = U.dp; if (!dp) return '';
  const [y, m] = dp.ym, first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), TK = todayKey();
  let grid;
  if (dp.yearMode) { const ys = []; for (let yy = new Date().getFullYear(); yy >= 1950; yy--) ys.push(yy); grid = `<div class="ygrid">${ys.map(yy => `<button data-act="dpYear" data-v="${yy}" class="${yy === y ? 'on' : ''}">${yy}</button>`).join('')}</div>`; }
  else grid = `<div class="dgrid">${WD.map(x => `<span>${x}</span>`).join('')}${'<i></i>'.repeat(first)}${Array.from({ length: n }, (_, i) => { const k = key(new Date(y, m, i + 1)); return `<button data-act="dpDay" data-v="${k}" class="${k === dp.val ? 'on' : ''}${k === TK ? ' tdy' : ''}"${k > TK ? ' disabled' : ''}>${i + 1}</button>`; }).join('')}</div>`;
  return `<div class="scrim dpwrap" data-act="dpClose"><div class="sheet dpk" role="dialog" aria-label="날짜 고르기"><div class="row"><b>${dp.which === 'start' ? '시작한 날' : '다 읽은 날'}</b><span class="sub">달력에서 고르거나 직접 입력해요</span></div>
    <input id="dptyped" class="field" inputmode="numeric" placeholder="예: 2019.3.5 또는 20190305" value="${dp.val ? dp.val.replace(/-/g, '.') : ''}" autocomplete="off"><div class="dperr">${esc(dp.err || '')}</div>
    <div class="dnav"><button data-act="dpMove" data-v="-1" aria-label="이전 달">‹</button><button class="ym" data-act="dpYearMode">${y}년 ${m + 1}월 ▾</button><button data-act="dpMove" data-v="1" aria-label="다음 달">›</button></div>
    ${grid}<div class="row" style="gap:8px"><button class="btn ghost" style="flex:1" data-act="dpClose" data-x="1">취소</button><button class="btn" style="flex:1" data-act="dpSave">저장</button></div></div></div>`;
}
function openPicker(which) {
  const b = books().find(x => x.id === U.journal); if (!b) return;
  const val = (which === 'start' ? bookStart(b) : bookEnd(b)) || todayKey(), d = fromKey(val);
  U.dp = { which, val, ym: [d.getFullYear(), d.getMonth()], yearMode: false, err: '' };
}
function savePicker() {
  const dp = U.dp, b = books().find(x => x.id === U.journal); if (!dp || !b) return;
  const s = bookStart(b), e = bookEnd(b);
  if (dp.which === 'end' && s && dp.val < s) { dp.err = '다 읽은 날은 시작한 날보다 앞일 수 없어요'; return; }
  if (dp.which === 'start' && b.done && e && dp.val > e) { dp.err = '시작한 날은 다 읽은 날보다 뒤일 수 없어요'; return; }
  const patch = dp.which === 'start' ? { startDate: dp.val } : { endDate: dp.val, done: true, page: b.total, doneAt: b.doneAt || Date.now() };
  saveProfile({ books: books().map(x => x.id === b.id ? { ...x, ...patch } : x), book: null });
  U.dp = null; ctx.toast(dp.which === 'start' ? '시작한 날을 바꿨어요' : '다 읽은 날을 바꿨어요');
}
export function onDateTyped(el) {
  const dp = U.dp; if (!dp) return;
  const k = parseTyped(el.value), errEl = document.querySelector('.dperr');
  if (k && k <= todayKey()) { const d = fromKey(k); dp.val = k; dp.ym = [d.getFullYear(), d.getMonth()]; dp.yearMode = false; dp.err = ''; ctx.render(); }
  else if (errEl) { dp.err = el.value.replace(/\D/g, '').length >= 8 ? (k ? '오늘 이후 날짜는 고를 수 없어요' : '날짜 형식을 확인해 주세요 (예: 2019.3.5)') : ''; errEl.textContent = dp.err; }
}

/* ---------- add a book (Kakao search or by hand) ---------- */
const KAKAO_KEY = import.meta.env.VITE_KAKAO_KEY || '';
async function kakaoSearch(q) {
  const url = `https://dapi.kakao.com/v3/search/book?size=15&query=${encodeURIComponent(q)}`, headers = { Authorization: `KakaoAK ${KAKAO_KEY}` };
  if (isNative) { const r = await CapacitorHttp.get({ url, headers }); if (r.status !== 200) throw new Error('kakao ' + r.status); return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; }
  const r = await fetch(url, { headers }); if (!r.ok) throw new Error('kakao ' + r.status); return r.json();
}
async function coverColor(url) {
  if (!url) return null;
  try {
    url = url.replace(/^http:/, 'https:');
    let src = url;
    if (isNative) { const r = await CapacitorHttp.get({ url, responseType: 'blob' }); if (r.status !== 200 || !r.data) return null; src = `data:image/jpeg;base64,${r.data}`; }
    const img = new Image(); img.crossOrigin = 'anonymous';
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = src; });
    const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 40, 40);
    const d = x.getImageData(0, 0, 40, 40).data, bk = {};
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if ((mx > 238 && mn > 222) || mx < 28) continue;
      const k = (r >> 5) + '-' + (g >> 5) + '-' + (b >> 5), sat = (mx - mn) / (mx || 1);
      const e = bk[k] || (bk[k] = { w: 0, n: 0, r: 0, g: 0, b: 0 }); e.w += 1 + sat * 1.5; e.n++; e.r += r; e.g += g; e.b += b;
    }
    const best = Object.values(bk).sort((a, b) => b.w - a.w)[0]; if (!best) return null;
    return '#' + ['r', 'g', 'b'].map(ch => Math.round(best[ch] / best.n).toString(16).padStart(2, '0')).join('');
  } catch (e) { console.warn('cover color', e); return null; }
}
export function bookAddHTML(wide) {
  const a = U.bookAdd; if (!a) return '';
  let inner;
  if (a.form) {
    const f = a.form;
    inner = `<div class="row"><b style="font-size:17px">책 추가</b><button class="btn ghost sm" data-act="bkBack">‹ 다시 찾기</button></div>
      <div class="bkpick">${f.thumb ? `<img src="${esc(f.thumb)}" alt="" referrerpolicy="no-referrer">` : `<span class="minisp" style="background:${f.color || SPINE[hash32(f.title || 'x') % SPINE.length]}"></span>`}<div style="min-width:0"><div class="sub">책등 색</div><span class="swatchline" style="background:${f.color || SPINE[hash32(f.title || 'x') % SPINE.length]}"></span>${f.colorBusy ? '<span class="sub"> 표지에서 색 뽑는 중…</span>' : ''}</div></div>
      <div class="bookform"><label class="full">책 제목<input class="field" id="ba-title" value="${esc(f.title || '')}" autocomplete="off"></label>
      <label class="full">지은이<input class="field" id="ba-author" value="${esc(f.author || '')}" autocomplete="off"></label>
      <label>전체 쪽<input class="field" id="ba-total" type="number" inputmode="numeric" min="1" placeholder="필수" value="${esc(f.total || '')}"></label>
      <label>지금 쪽<input class="field" id="ba-page" type="number" inputmode="numeric" min="0" value="${esc(f.page || 0)}"></label></div>
      <label class="chkline"><input type="checkbox" id="ba-done"${f.doneAlready ? ' checked' : ''}> 이미 다 읽은 책이에요 <span class="sub">(날짜는 책 페이지에서 고칠 수 있어요)</span></label>
      <button class="btn" data-act="bkSave">책장에 추가</button>${f.fromKakao ? '<div class="prov">책 정보: 카카오 책 검색</div>' : ''}`;
  } else {
    const res = a.results || [];
    inner = `<div class="row"><b style="font-size:17px">책 추가</b><button class="xbtn" data-act="bkAddClose" data-x="1" aria-label="닫기">×</button></div>
      ${KAKAO_KEY ? `<div class="inline-add"><input id="bk-q" class="field" placeholder="책 제목이나 지은이로 찾기" value="${esc(a.q || '')}" enterkeyhint="search" autocomplete="off"><button class="btn sm" data-act="bkSearch">찾기</button></div>` : '<div class="sub">책 검색을 쓸 수 없어서 직접 적어 주세요.</div>'}
      ${a.loading ? '<div class="sub" style="text-align:center;padding:10px">찾는 중…</div>' : ''}${a.err ? `<div class="sub" style="color:var(--c7)">${esc(a.err)}</div>` : ''}
      ${res.length ? `<div class="bkres">${res.map((r, i) => `<button class="bkr" data-act="bkPick" data-v="${i}">${r.thumbnail ? `<img src="${esc(r.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="noimg"></span>'}<span class="blt"><b>${esc(r.title)}</b><span class="sub">${esc([(r.authors || []).join(', '), r.publisher].filter(Boolean).join(' · '))}</span></span></button>`).join('')}</div><div class="prov">책 정보: 카카오 책 검색</div>` : ''}
      ${a.searched && !res.length && !a.loading && !a.err ? '<div class="sub" style="text-align:center">검색 결과가 없어요</div>' : ''}
      <button class="btn ghost" data-act="bkManual">직접 입력하기</button>`;
  }
  return `<div class="scrim${wide ? ' center' : ''}" data-act="bkAddClose"><div class="sheet" role="dialog" aria-label="책 추가"><div class="grab"></div>${inner}</div></div>`;
}
async function doSearch() {
  const a = U.bookAdd, q = (document.getElementById('bk-q')?.value || '').trim(); if (!a || !q) return;
  a.q = q; a.loading = true; a.err = ''; ctx.render();
  try { const r = await kakaoSearch(q); a.results = (r.documents || []).map(d => ({ title: d.title, authors: d.authors, publisher: d.publisher, thumbnail: (d.thumbnail || '').replace(/^http:/, 'https:'), isbn: d.isbn })); }
  catch (e) { console.warn(e); a.results = []; a.err = '검색하지 못했어요. 인터넷 연결을 확인하거나 직접 입력해 주세요.'; }
  a.loading = false; a.searched = true; ctx.render();
}
function pickResult(i) {
  const a = U.bookAdd, r = a?.results?.[i]; if (!r) return;
  a.form = { title: r.title, author: (r.authors || []).join(', '), publisher: r.publisher, isbn: r.isbn, thumb: r.thumbnail, fromKakao: true, colorBusy: !!r.thumbnail };
  const f = a.form;
  coverColor(r.thumbnail).then(c => { f.colorBusy = false; if (c) f.color = c; ctx.render(); });
}
function readForm() { const f = U.bookAdd?.form; if (!f) return; const g = id => document.getElementById(id); if (g('ba-title')) { f.title = g('ba-title').value; f.author = g('ba-author').value; f.total = g('ba-total').value; f.page = g('ba-page').value; f.doneAlready = g('ba-done').checked; } }
function saveNewBook() {
  readForm(); const f = U.bookAdd.form, title = (f.title || '').trim(), total = Math.max(0, parseInt(f.total, 10) || 0);
  if (!title || !total) { ctx.toast('제목과 전체 쪽수를 넣어 주세요'); return; }
  const TK = todayKey(), done = !!f.doneAlready, page = done ? total : Math.max(0, Math.min(total, parseInt(f.page, 10) || 0));
  const nb = { id: uid(), title, author: (f.author || '').trim(), publisher: f.publisher || '', isbn: f.isbn || '', color: f.color || '', total, page, done, doneAt: done ? Date.now() : null, startDate: TK, endDate: done ? TK : null, createdAt: Date.now() };
  const fs = frontShelf(); if (fs !== undefined) nb.shelf = fs;
  saveProfile({ books: [...books(), nb], book: null });
  U.bookAdd = null; ctx.toast(done ? `‘${title}’을 책장에 꽂았어요` : `‘${title}’ 읽기 시작!`);
}

/* ---------------- mood ---------------- */
export const LV = [
  { k: 5, n: '최고', c: '#F7A6C4', words: ['행복', '설렘', '뿌듯', '신남', '감사'] },
  { k: 4, n: '좋음', c: '#FFD36E', words: ['편안', '즐거움', '만족', '기대', '다정'] },
  { k: 3, n: '보통', c: '#A8DDA0', words: ['무난', '차분', '멍함', '바쁨', '그럭저럭'] },
  { k: 2, n: '별로', c: '#9DC3F0', words: ['피곤', '지침', '걱정', '심심', '아쉬움'] },
  { k: 1, n: '최악', c: '#B6A8D9', words: ['우울', '불안', '짜증', '서운', '외로움'] }
];
const byK = k => LV.find(l => l.k === k) || LV[2];
const EMOJI = { '🥰': 5, '😊': 4, '🔥': 4, '🙂': 3, '😴': 2, '🌧️': 2, '😵': 1 };
export const moodsOf = d => (Array.isArray(d?.moods) && d.moods.length ? d.moods.filter(k => k >= 1 && k <= 5).slice(0, 3) : d?.mood && EMOJI[d.mood] ? [EMOJI[d.mood]] : []);
const bgOf = ks => { const c = ks.map(k => byK(k).c); if (c.length === 1) return c[0]; const s = 100 / c.length; return `linear-gradient(135deg,${c.map((x, i) => `${x} ${i * s}%,${x} ${(i + 1) * s}%`).join(',')})`; };
const jdot = (ks, size, rot) => `<i class="jdot" style="background:${bgOf(ks)};${size ? `width:${size}px;height:${size}px;` : ''}transform:rotate(${rot || 0}deg)"></i>`;

export function moodBlock() {
  const TK = todayKey(), d = S.days[TK] || {}, ks = moodsOf(d), feels = d.feels || [];
  const first = ks.map(byK), others = LV.filter(l => !ks.includes(l.k)), shown = first.length ? first : LV.slice(0, 2), rest = first.length ? others : LV.slice(2);
  const grp = l => `<div class="fgrp"><em style="background:${l.c}"></em>${l.words.map(w => `<button class="feel${feels.includes(w) ? ' on' : ''}" data-act="feel" data-v="${w}">${w}</button>`).join('')}</div>`;
  let h = `<div class="card stack mblock"><div class="row"><span class="lbl b">오늘의 기분</span><span class="sub">${+TK.slice(5, 7)}월 ${+TK.slice(8)}일 ${WD[new Date().getDay()]}요일</span></div>
    <div class="sub">어떤 기분이었어요? (3개까지, 처음 고른 게 대표 기분)</div>
    <div class="mchips">${LV.map(l => { const i = ks.indexOf(l.k); return `<button class="mc${i >= 0 ? ' on' : ''}" data-act="moodPick" data-v="${l.k}"><i style="background:${l.c}"></i>${l.n}${i >= 0 ? `<b>${i + 1}</b>` : ''}</button>`; }).join('')}</div>
    <div class="sub">세부 감정 (선택, 4개까지)</div>${shown.map(grp).join('')}${U.feelsAll ? rest.map(grp).join('') + '<button class="linkbtn2" data-act="feelsAll">접기</button>' : '<button class="linkbtn2" data-act="feelsAll">다른 감정 더 보기</button>'}`;
  const memo = d.memo || '';
  if (memo && !U.diaryEdit) h += `<div class="dsaved${U.diaryFull ? '' : ' clamp'}" data-dtap="1">${esc(memo)}</div><div class="row sub"><span>두 번 눌러 수정</span>${memo.length > 70 ? `<button class="linkbtn2" data-act="diaryFull">${U.diaryFull ? '접기' : '더 보기'}</button>` : ''}</div>`;
  else h += `<input class="diary" id="diary" placeholder="오늘 한 줄 일기 · Enter로 저장" value="${esc(memo)}" maxlength="300" autocomplete="off" enterkeyhint="done">${U.diaryEdit ? `<div class="row sub"><span>Enter 저장 · Esc 취소</span><button class="linkbtn2 warn" data-act="diaryDel">${ctx.armed('diarydel') ? '한 번 더 누르면 삭제' : '삭제'}</button></div>` : ''}`;
  h += '</div>';
  // month calendar
  const now = new Date(), mk = U.mMonth || key(new Date(now.getFullYear(), now.getMonth(), 1)), md = fromKey(mk), y = md.getFullYear(), m = md.getMonth();
  const firstWd = (new Date(y, m, 1).getDay() - st().weekStart + 7) % 7, n = new Date(y, m + 1, 0).getDate(), sel = U.mSel || TK;
  let cal = ''; for (let i = 0; i < 7; i++) cal += `<span class="h">${WD[(i + st().weekStart) % 7]}</span>`;
  cal += '<span></span>'.repeat(firstWd);
  for (let i = 1; i <= n; i++) { const k = key(new Date(y, m, i)), v = moodsOf(S.days[k]), fut = k > TK, rot = (i * 47) % 360;
    cal += `<button class="md${k === TK ? ' today' : ''}${k === sel ? ' sel' : ''}"${fut ? ' disabled' : ` data-act="mSel" data-v="${k}"`}>${v.length ? jdot(v, 0, rot) : `<i class="jdot e" style="transform:rotate(${rot}deg)"></i>`}<span>${i}</span></button>`; }
  const sd = S.days[sel] || {}, sv = moodsOf(sd), sf = sd.feels || [], [, sm, sdd] = sel.split('-');
  const isThis = y === now.getFullYear() && m === now.getMonth();
  h += `<div class="card stack mblock"><div class="row"><span class="lbl b">${isThis ? '이번 달' : `${y}년 ${m + 1}월`}</span><span class="mnav"><button data-act="mMonth" data-v="-1" aria-label="이전 달">‹</button>${isThis ? '' : '<button data-act="mMonth" data-v="0" class="t">이번 달</button>'}<button data-act="mMonth" data-v="1" aria-label="다음 달"${isThis ? ' disabled' : ''}>›</button></span></div>
    <div class="mcal">${cal}</div><div class="mleg">${LV.map(l => `<span><i style="background:${l.c}"></i>${l.n}</span>`).join('')}</div>
    ${sv.length ? `<button class="mpeek${U.peekFull ? ' open' : ''}" data-act="peek">${jdot(sv, 30)}<span class="mpt"><b>${+sm}월 ${+sdd}일 · ${sv.map(k => byK(k).n).join(' + ')}</b>${sf.length ? ' · ' + esc(sf.join(', ')) : ''}${sd.memo ? `<span class="pl">${esc(sd.memo)}</span>` : ''}</span></button>` : `<div class="mpeek empty">${+sm}월 ${+sdd}일은 기록이 없어요</div>`}
    <button class="btn" data-act="mStats">기분 통계 보기</button></div>`;
  return h;
}

export function moodStatsHTML(wide) {
  const TK = todayKey(), now = new Date(), range = U.mRange || 'month';
  const from = range === 'month' ? key(new Date(now.getFullYear(), now.getMonth(), 1)) : key(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  const list = Object.values(S.days).filter(d => d.date >= from && d.date <= TK && moodsOf(d).length).map(d => ({ ks: moodsOf(d), f: d.feels || [], w: fromKey(d.date).getDay() }));
  const all = list.flatMap(x => x.ks), tot = all.length || 1, cnt = LV.map(l => all.filter(k => k === l.k).length);
  const dayAvg = x => x.ks.reduce((a, b) => a + b, 0) / x.ks.length;
  const avg = list.length ? list.reduce((a, b) => a + dayAvg(b), 0) / list.length : 0, avgK = Math.round(avg) || 3;
  const order = [...Array(7)].map((_, i) => (i + st().weekStart) % 7);
  const wk = order.map(w => { const a = list.filter(x => x.w === w); return a.length ? a.reduce((s, b) => s + dayAvg(b), 0) / a.length : 0; });
  const fc = {}; list.forEach(x => x.f.forEach(w => { fc[w] = (fc[w] || 0) + 1; })); const top = Object.entries(fc).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const wordLv = w => LV.find(l => l.words.includes(w)) || LV[2];
  let streak = 0; for (let i = 0; i < 400; i++) { const k = addKey(TK, -i); if (moodsOf(S.days[k]).length) streak++; else if (i > 0) break; }
  const mixed = list.filter(x => x.ks.length > 1).length, best = wk.indexOf(Math.max(...wk));
  const yr = now.getFullYear(); let year = '';
  for (let mm = 0; mm < 12; mm++) { year += `<span>${mm + 1}월</span>`; for (let dd = 1; dd <= 31; dd++) { const dt = new Date(yr, mm, dd), ok = dt.getMonth() === mm, v = ok ? moodsOf(S.days[key(dt)]) : []; year += `<i style="${!ok ? 'visibility:hidden' : v.length ? `background:${byK(v[0]).c}` : ''}"></i>`; } }
  return `<div class="jpage${wide ? ' wide' : ''}" role="dialog" aria-label="기분 통계"><div class="jbox">
    <div class="pghd"><button class="back" data-act="mStatsClose" aria-label="뒤로">‹</button><div class="t"><b>기분 통계</b></div></div>
    <div class="pgbody stack"><div class="seg" style="align-self:center"><button class="${range === 'month' ? 'on' : ''}" data-act="mRange" data-v="month">이번 달</button><button class="${range === '3m' ? 'on' : ''}" data-act="mRange" data-v="3m">최근 3달</button></div>
      ${S.loadingDays ? '<div class="sub" style="text-align:center">예전 기록 불러오는 중…</div>' : ''}
      ${list.length ? `<div class="card stack"><div class="sbig">${jdot([avgK], 46)}<div><b>평균 ‘${byK(avgK).n}’</b><div class="sub">${range === 'month' ? '이번 달' : '최근 3달'} ${list.length}일 기록 · 섞인 날 ${mixed}일 · 연속 ${streak}일째</div></div></div>
        <div class="dist">${LV.map((l, i) => cnt[i] ? `<i style="width:${cnt[i] / tot * 100}%;background:${l.c}"></i>` : '').join('')}</div>
        <div class="drow">${LV.map((l, i) => `<span>${l.n} <b>${cnt[i]}</b></span>`).join('')}</div></div>
      <div class="card stack"><div class="row"><span class="lbl b">요일별 기분</span>${Math.max(...wk) ? `<span class="sub">${WD[order[best]]}요일이 제일 좋았어요</span>` : ''}</div>
        <div class="wkbars">${wk.map((v, i) => `<div><i style="height:${v ? Math.max(8, (v - 1) / 4 * 80 + 8) : 4}px;background:${v ? byK(Math.round(v)).c : 'var(--line)'}"></i>${WD[order[i]]}</div>`).join('')}</div></div>
      <div class="card stack"><span class="lbl b">자주 느낀 감정</span>${top.length ? `<div class="topf">${top.map(([w, c]) => `<div><b>${esc(w)}</b><i style="width:${c / top[0][1] * 60}%;background:${wordLv(w).c}"></i><span class="sub">${c}번</span></div>`).join('')}</div>` : '<div class="sub">세부 감정을 고른 날이 없어요</div>'}</div>`
      : '<div class="sub" style="text-align:center;padding:24px 0">이 기간에는 기분 기록이 없어요</div>'}
      <div class="card stack"><div class="row"><span class="lbl b">${yr}년 한눈에 보기</span><span class="sub">대표 기분 색</span></div><div class="ygrid2">${year}</div></div>
    </div></div></div>`;
}
function setMoods(ks) { putDay(todayKey(), { moods: ks, mood: '' }); }
function saveDiary(v) { putDay(todayKey(), { memo: v }); }

/* ---------------- actions ---------------- */
// returns true if the action was handled here
export function recordAct(a, el, arm) {
  const v = el.dataset.v, id = el.dataset.id, TK = todayKey();
  switch (a) {
    case 'blkToggle': {
      const p = blocksOf(), i = p.indexOf(v);
      if (i >= 0) { if (p.length === 1) { ctx.toast('블록은 하나 이상 있어야 해요'); return true; } p.splice(i, 1); }
      else if (p.length >= 2) { ctx.toast('2개까지 고를 수 있어요. 하나를 빼고 골라 주세요'); return true; }
      else p.push(v);
      saveSettings({ blocks: p }); return true;
    }
    case 'blkSwap': saveSettings({ blocks: blocksOf().reverse() }); return true;
    case 'shelfOpen': U.shelf = true; U.shelfEdit = false; return true;
    case 'shelfClose': U.shelf = false; U.shelfEdit = false; U.shelfQ = ''; return true;
    case 'shelfEdit': U.shelfEdit = !U.shelfEdit; return true;
    case 'shelfView': U.shelfView = v; U.shelfEdit = false; return true;
    case 'bkAdd': U.bookAdd = { q: '', results: [] }; return true;
    case 'bkAddClose': U.bookAdd = null; return true;
    case 'bkSearch': doSearch(); return true;
    case 'bkPick': pickResult(+v); return true;
    case 'bkManual': U.bookAdd.form = { title: (document.getElementById('bk-q')?.value || '').trim() }; return true;
    case 'bkBack': readForm(); U.bookAdd.form = null; return true;
    case 'bkSave': saveNewBook(); return true;
    case 'bookFinish': {
      const b = books().find(x => x.id === id); if (!b) return true;
      const fs = frontShelf();
      saveProfile({ books: books().map(x => x.id === id ? { ...x, page: x.total, done: true, doneAt: Date.now(), endDate: TK, ...(fs !== undefined ? { shelf: fs } : {}) } : x), book: null });
      ctx.toast(`‘${b.title}’ 다 읽었어요! 책장에 꽂았어요`); return true;
    }
    case 'dpOpen': openPicker(v); return true;
    case 'dpClose': U.dp = null; return true;
    case 'dpMove': { let [y, m] = U.dp.ym; m += +v; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } U.dp.ym = [y, m]; return true; }
    case 'dpYearMode': U.dp.yearMode = !U.dp.yearMode; return true;
    case 'dpYear': U.dp.ym = [+v, U.dp.ym[1]]; U.dp.yearMode = false; return true;
    case 'dpDay': U.dp.val = v; U.dp.err = ''; return true;
    case 'dpSave': savePicker(); return true;
    case 'moodPick': {
      const k = +v, cur = moodsOf(S.days[TK]);
      if (cur.includes(k)) setMoods(cur.filter(x => x !== k));
      else if (cur.length >= 3) ctx.toast('기분은 3개까지 고를 수 있어요');
      else setMoods([...cur, k]);
      return true;
    }
    case 'feel': {
      const cur = S.days[TK]?.feels || [];
      if (cur.includes(v)) putDay(TK, { feels: cur.filter(x => x !== v) });
      else if (cur.length >= 4) ctx.toast('세부 감정은 4개까지 고를 수 있어요');
      else putDay(TK, { feels: [...cur, v] });
      return true;
    }
    case 'feelsAll': U.feelsAll = !U.feelsAll; return true;
    case 'diaryFull': U.diaryFull = !U.diaryFull; return true;
    case 'diaryDel': if (arm('diarydel')) { saveDiary(''); U.diaryEdit = false; ctx.toast('일기를 지웠어요'); } return true;
    case 'mSel': U.mSel = v; U.peekFull = false; return true;
    case 'peek': U.peekFull = !U.peekFull; return true;
    case 'mMonth': {
      const now = new Date(); if (v === '0') { U.mMonth = null; return true; }
      const d = fromKey(U.mMonth || key(new Date(now.getFullYear(), now.getMonth(), 1))), nd = new Date(d.getFullYear(), d.getMonth() + +v, 1);
      if (nd > now) return true; U.mMonth = key(nd);
      if (key(nd) < (S.daysFrom || '')) loadAllDays();
      return true;
    }
    case 'mStats': U.moodStats = true; loadAllDays(); return true;
    case 'mStatsClose': U.moodStats = false; return true;
    case 'mRange': U.mRange = v; return true;
  }
  return false;
}
// double tap on the saved diary opens editing
let lastTap = 0;
export function recordClick(e) {
  if (!e.target.closest('[data-dtap]')) return false;
  const n = Date.now(); if (n - lastTap < 400) { U.diaryEdit = true; U.focusDiary = true; lastTap = 0; ctx.render(); } else lastTap = n;
  return true;
}
export function recordKey(e) {
  const id = e.target.id;
  if (id === 'diary') {
    e.preventDefault();
    if (e.key === 'Escape') { U.diaryEdit = false; ctx.render(); return true; }
    const v = e.target.value.trim();
    if (v) { saveDiary(v); U.diaryEdit = false; e.target.blur(); ctx.toast('일기를 저장했어요'); }
    else if (U.diaryEdit) { U.diaryEdit = false; ctx.render(); }
    return true;
  }
  if (id === 'bk-q' && e.key === 'Enter') { e.preventDefault(); doSearch(); return true; }
  if (id === 'dptyped' && e.key === 'Enter') { e.preventDefault(); savePicker(); ctx.render(); return true; }
  return false;
}
export function recordBack() {
  if (U.dp) { U.dp = null; return true; }
  if (U.bookAdd) { U.bookAdd = null; return true; }
  if (U.moodStats) { U.moodStats = false; return true; }
  if (U.shelf && !U.journal) { U.shelf = false; U.shelfEdit = false; return true; }
  return false;
}
