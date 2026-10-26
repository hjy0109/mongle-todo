import { S, todosOn, index, render as requestRender, saveProfile, saveSettings, putDay, addTodo, toggleTodo, updateTodo, deleteTodo, moveTodo, setRepeat, toggleHabit, ensureRoutines, ensureLoaded, later, putTodo, setShare, sharedCats, unseenReactions } from './store.js';
import { AVATARS, STICKERS, avatarHTML, stickerHTML } from './pixels.js';
import { key, fromKey, addDays, addKey, todayKey, WD, fmtDay, esc, uid, ddLabel, fmtT, pad, rnd } from './util.js';
import { THEMES, GARDENS, COLORS, SHAPES, sprite, spriteInner, themeOf, gardenOf, gardenIdOf } from './themes.js';
import { REPEATS, repName, habitsOn, isSpecial, habitStreak } from './logic.js';
import { isNative, notifPermission, requestNotifPermission, testNotification, saveBackup } from './native.js';

export const VERSION = '1.0.0';
const MOODS = ['🙂', '😊', '🥰', '😴', '🔥', '🌧️', '😵'];
const U = S.ui;
Object.assign(U, { friend: null, fdate: null, picker: null, addOpen: false, editProfile: false, pfAvatar: null, tab: 'todo', view: 'week', selected: todayKey(), adding: null, sheet: null, ddsheet: false, sdOpen: false,
  editCat: null, newColor: 'c6', arm: null, habitEdit: false, bookEdit: false, gardenPick: false, hdate: null, loginErr: '', busy: false, notif: null });

const I = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  checkW: '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/></svg>',
  dots: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>',
  tTodo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="7"/><path d="M8 12.5l3 3 5-6"/></svg>',
  tHabit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 12C12 8 9 5 4.5 5c0 4 3 7 7.5 7z"/><path d="M12 14c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6z"/></svg>',
  tFriends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="3.5"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M15 15.2c2.6-.4 4.6 1 5.4 3.8"/></svg>',
  smile: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="12" r="8"/><path d="M7.8 14.5c.9 1.2 2 1.8 3.2 1.8s2.3-.6 3.2-1.8M8.5 10h.01M13.5 10h.01"/><path d="M20 2.5v4M18 4.5h4"/></svg>',
  note: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10l4 4v12H5z"/><path d="M9 11h6M9 15h4"/></svg>',
  tSet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="4"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>'
};
const NAV = [['todo', '할 일', I.tTodo], ['friends', '친구', I.tFriends], ['habit', '습관', I.tHabit], ['set', '설정', I.tSet]];
const navBadge = id => { const n = id === 'todo' ? unseenReactions().length : id === 'friends' ? S.social.incoming.length : 0; return n ? `<span class="badge">${n}</span>` : ''; };
const fprof = uid => S.social.profiles[uid] || { nickname: '친구', avatar: 'rabbit' };

const P = () => S.profile;
const st = () => S.profile.settings;
const cc = c => (COLORS.includes(c) ? c : 'c10');
const catOf = id => P().cats.find(c => c.id === id) || { id, name: '분류 없음', color: 'c10' };
const T = t => fmtT(t, st().h24);
const armed = k => U.arm === k;

/* ---------------- shared pieces ---------------- */
function blob(k) {
  const a = todosOn(k);
  if (!a.length) return '<span class="blob empty"><span class="in"></span></span>';
  const done = a.filter(t => t.done).length, left = a.length - done;
  if (!left) return `<span class="blob full">${I.check}</span>`;
  const p = Math.round(done / a.length * 100);
  return `<span class="blob" style="background:conic-gradient(var(--accent) ${p}%, var(--line) 0)"><span class="in">${left}</span></span>`;
}
function calCells(sel, view, interactive = true) {
  const d = fromKey(sel), ws = st().weekStart, TK = todayKey(); let cells = [];
  if (view === 'week') {
    const off = (d.getDay() - ws + 7) % 7, start = addDays(d, -off);
    for (let i = 0; i < 7; i++) cells.push({ d: addDays(start, i), out: false });
  } else {
    const first = new Date(d.getFullYear(), d.getMonth(), 1), off = (first.getDay() - ws + 7) % 7;
    const start = addDays(first, -off), last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const total = Math.ceil((off + last.getDate()) / 7) * 7;
    for (let i = 0; i < total; i++) { const x = addDays(start, i); cells.push({ d: x, out: x.getMonth() !== d.getMonth() }); }
  }
  let h = '';
  for (let i = 0; i < 7; i++) { const w = (i + ws) % 7; h += `<div class="wd${w === 0 ? ' sun' : ''}">${WD[w]}</div>`; }
  for (const c of cells) {
    const k = key(c.d);
    const cls = ['day', k === TK ? 'today' : '', interactive && k === sel ? 'sel' : '', c.out ? 'out' : ''].join(' ');
    h += `<button class="${cls}" data-act="sel" data-k="${k}" aria-label="${fmtDay(k)}"><span class="n">${c.d.getDate()}</span>${blob(k)}</button>`;
  }
  return h;
}
function monthNav(view) {
  const d = fromKey(U.selected);
  return `<div class="month"><button class="navbtn" data-act="nav" data-view="${view}" data-d="-1" aria-label="이전">${I.left}</button>${d.getFullYear()}.${pad(d.getMonth() + 1)}<button class="navbtn" data-act="nav" data-view="${view}" data-d="1" aria-label="다음">${I.right}</button></div>`;
}
function ddayStrip() {
  const TK = todayKey();
  const p = P().ddays.filter(x => x.pin && x.date >= TK).sort((a, b) => a.date.localeCompare(b.date));
  return `<div class="ddays">${p.map(x => `<button class="dday" data-act="ddsheet"><b>${ddLabel(x.date)}</b>${esc(x.name)}</button>`).join('')}<button class="dday add" data-act="ddsheet">${p.length ? 'D-day 관리' : '+ D-day'}</button></div>`;
}
function todoRow(t) {
  const sd = (t.subs || []).filter(s => s.done).length;
  let h = `<li class="todo${t.done ? ' done' : ''}"><button class="chk" data-act="toggle" data-id="${esc(t.id)}" aria-label="완료 표시">${I.checkW}</button><div class="txw"><span class="tx">${esc(t.text)}</span>`;
  const meta = [];
  if (t.time) meta.push(`<span class="bell">${I.bell}${T(t.time)}</span>`);
  if (t.routineId && S.routines[t.routineId]) meta.push(`<span class="tagp">${I.repeat}${repName(S.routines[t.routineId].rule)}</span>`);
  if ((t.subs || []).length) meta.push(`<span class="tagp">${I.list}${sd}/${t.subs.length}</span>`);
  if (meta.length) h += `<span class="meta">${meta.join('')}</span>`;
  const rx = Object.values(S.social.reactions).filter(r => r.todoId === t.id && S.social.friends.includes(r.from));
  if (rx.length) h += `<span class="rx">${rx.map(r => `<span class="rxp${r.seen ? '' : ' new'}" title="${esc(fprof(r.from).nickname)}">${avatarHTML(fprof(r.from).avatar, 18)}${stickerHTML(r.sticker, 16)}</span>`).join('')}</span>`;
  h += `</div><button class="more" data-act="more" data-id="${esc(t.id)}" aria-label="할 일 메뉴">${I.dots}</button></li>`;
  if ((t.subs || []).length && !t.done) h += `<li><ul class="subs">${t.subs.map(s => `<li class="sub-i${s.done ? ' done' : ''}"><button class="chk sm${s.done ? ' on' : ''}" data-act="subtoggle" data-id="${esc(t.id)}" data-s="${esc(s.id)}" aria-label="하위 할 일 완료">${I.checkW}</button><span>${esc(s.text)}</span></li>`).join('')}</ul></li>`;
  return h;
}
function catBlock(c, k) {
  const items = todosOn(k).filter(t => t.cat === c.id);
  const pub = S.backend.social?.enabled && (P().share || []).includes(c.id);
  let h = `<button class="chip" data-act="add" data-cat="${esc(c.id)}"><span class="dot"></span>${esc(c.name)}<span class="plus">+</span></button>${pub ? ' <span class="pubtag">친구 공개</span>' : ''}<ul class="todos">`;
  h += items.map(todoRow).join('');
  if (U.adding === c.id) h += `<li class="addrow"><span class="chk"></span><input id="addinput" placeholder="할 일 입력 후 Enter" autocomplete="off" enterkeyhint="done"></li>`;
  else if (!items.length) h += '<li class="empty-hint">+ 를 눌러 할 일을 추가해요</li>';
  return h + '</ul>';
}
function orphanBlock(k) {
  const ids = new Set(P().cats.map(c => c.id));
  const items = todosOn(k).filter(t => !ids.has(t.cat));
  if (!items.length) return '';
  return `<div style="--c:var(--c10)"><span class="chip"><span class="dot"></span>분류 없음</span><ul class="todos">${items.map(todoRow).join('')}</ul></div>`;
}
const moodBtn = k => { const m = S.days[k]?.mood; return `<button class="mood${m ? ' set' : ''}" data-act="mood" aria-label="오늘의 기분">${m || '+'}</button>`; };
function somedayBlock() {
  const items = todosOn('');
  let h = `<div class="someday"><button class="sdhead" data-act="sdtoggle">언젠가 할 일 <span class="pill-tag">${items.length}</span><span class="tog">${U.sdOpen ? '접기' : '펼치기'}</span></button>`;
  if (U.sdOpen) {
    h += items.map(t => { const c = catOf(t.cat); return `<div class="plan-i" style="--c:var(--${cc(c.color)})"><span class="chip sm"><span class="dot"></span>${esc(c.name)}</span><span class="nm">${esc(t.text)}</span><button class="btn ghost sm" data-act="schedule" data-id="${esc(t.id)}">이 날 하기</button><button class="more" data-act="more" data-id="${esc(t.id)}" aria-label="메뉴">${I.dots}</button></div>`; }).join('') || '<div class="sub">비어 있어요</div>';
    h += `<div class="inline-add"><input id="somedayinput" placeholder="날짜 없이 적어두기 (Enter)" autocomplete="off" enterkeyhint="done"></div><div class="hint">‘이 날 하기’를 누르면 지금 보고 있는 ${fmtDay(U.selected)}로 옮겨져요.</div>`;
  }
  return h + '</div>';
}
const errBar = () => S.error ? `<div class="errbar"><span style="flex:1">${esc(S.error)}</span><button class="xbtn" data-act="clearerr" aria-label="닫기">×</button></div>` : '';

/* ---------------- todo tab (phone) ---------------- */
function renderTodo() {
  const k = U.selected;
  let h = `${errBar()}${ddayStrip()}<div class="hd">${monthNav(U.view)}
    <div class="seg"><button class="${U.view === 'week' ? 'on' : ''}" data-act="view" data-v="week">주</button><button class="${U.view === 'month' ? 'on' : ''}" data-act="view" data-v="month">월</button></div></div>
    <div class="cal">${calCells(k, U.view)}</div>
    <div class="dayhd"><h2>${fmtDay(k)}</h2>${k !== todayKey() ? '<button class="pill-tag" data-act="today">오늘로</button>' : ''}${moodBtn(k)}</div>
    <input class="memo" id="memo" placeholder="한 줄 일기를 남겨보세요" value="${esc(S.days[k]?.memo || '')}" autocomplete="off">
    ${newRxCard()}<div class="cats">`;
  for (const c of P().cats) h += `<div style="--c:var(--${cc(c.color)})">${catBlock(c, k)}</div>`;
  return h + orphanBlock(k) + '</div>' + somedayBlock();
}

/* ---------------- habit tab ---------------- */
function garden(weeks) {
  const w = gardenOf(st()), ws = st().weekStart, today = new Date(), TK = todayKey(), total = P().habits.length;
  const off = (today.getDay() - ws + 7) % 7, start = addDays(today, -off - 7 * (weeks - 1));
  let cells = '', months = '', lastM = -1;
  for (let c = 0; c < weeks; c++) {
    const m = addDays(start, c * 7).getMonth();
    months += `<span>${m !== lastM ? (m + 1) + '월' : ''}</span>`; lastM = m;
    for (let r = 0; r < 7; r++) {
      const d = addDays(start, c * 7 + r), k = key(d);
      if (k > TK) { cells += '<span class="gc fut"></span>'; continue; }
      const n = habitsOn(S, k).length, lvl = n && total ? Math.max(1, Math.round(n / total * 4)) : 0;
      const cls = (k === (U.hdate || TK)) ? ' now' : '';
      if (isSpecial(S, k)) cells += `<button class="gc sp${cls}" style="background:${w.spBg}" data-act="hdate" data-k="${k}" aria-label="${fmtDay(k)}">${sprite(w.sp[rnd(k + 'kind') < 0.75 ? 0 : w.sp.length - 1])}</button>`;
      else cells += `<button class="gc${cls}" style="${lvl ? 'background:' + w.lv[lvl - 1] : ''}" data-act="hdate" data-k="${k}" aria-label="${fmtDay(k)} ${n}/${total}"></button>`;
    }
  }
  let days = ''; for (let r = 0; r < 7; r++) { const wd = (r + ws) % 7; days += `<span>${[1, 3, 5].includes(wd) ? WD[wd] : ''}</span>`; }
  return `<div class="garden"><span></span><div class="gmonths">${months}</div><div class="gdays">${days}</div><div class="ggrid">${cells}</div></div>`;
}
function gardenPicker() {
  const cur = st().garden || 'auto', tg = themeOf(st().theme).garden;
  return `<div class="gardens"><button class="gardenbtn${cur === 'auto' ? ' on' : ''}" data-act="garden" data-v="auto">${sprite(GARDENS[tg].sp[0], `background:${GARDENS[tg].spBg}`)}테마 따라가기</button>${Object.entries(GARDENS).map(([id, g]) => `<button class="gardenbtn${cur === id ? ' on' : ''}" data-act="garden" data-v="${id}">${sprite(g.sp[0], `background:${g.spBg}`)}${g.name}</button>`).join('')}</div>`;
}
function renderHabit(wide) {
  const w = gardenOf(st()), weeks = wide ? 30 : Math.max(8, Math.min(26, Math.floor((Math.min(innerWidth, 620) - 2 * 18 - 2 * 16 - 26) / 18))), TK = todayKey(), hk = U.hdate || TK, total = P().habits.length;
  const today = new Date(), off = (today.getDay() - st().weekStart + 7) % 7, start = addDays(today, -off - 7 * (weeks - 1));
  let found = 0; for (let d = new Date(start); key(d) <= TK; d = addDays(d, 1)) if (isSpecial(S, key(d))) found++;
  let full = 0; for (let i = 1; i <= today.getDate(); i++) { if (total && habitsOn(S, key(new Date(today.getFullYear(), today.getMonth(), i))).length === total) full++; }
  let best = 0, run = 0; for (let i = 229; i >= 0; i--) { if (total && habitsOn(S, key(addDays(today, -i))).length === total) { run++; best = Math.max(best, run); } else run = 0; }
  const on = new Set(habitsOn(S, hk));
  let h = `${errBar()}<div class="row" style="margin-bottom:12px"><h2 class="title" style="margin:0">습관</h2><button class="world" data-act="gardenPick">${sprite(w.sp[0], `background:${w.spBg}`)}${w.name}</button></div><div class="stack">`;
  if (U.gardenPick) h += `<div class="card stack"><div class="row"><span class="lbl b">정원 고르기</span><button class="xbtn" data-act="gardenPick" aria-label="닫기">×</button></div>${gardenPicker()}</div>`;
  h += `<div class="card stack">${garden(weeks)}<div class="glegend">적음${w.lv.map(c => `<span class="gc" style="background:${c}"></span>`).join('')}많음<span style="margin-left:auto">${w.msg}</span></div></div>
    <div class="stats"><div class="stat"><div class="v">${full}</div><div class="k">이번 달 다 한 날</div></div>
      <div class="stat"><div class="v">${best}</div><div class="k">최고 연속</div></div>
      <div class="stat"><div class="v"><span class="gc sp" style="--gs:22px;background:${w.spBg};border-radius:6px">${sprite(w.sp[0])}</span>${found}</div><div class="k">모은 ${w.unit}</div></div></div>`;
  h += `<div class="card"><div class="row" style="margin-bottom:4px"><span class="lbl b">${hk === TK ? '오늘의 습관' : fmtDay(hk) + ' 습관'} ${on.size}/${total}</span><span style="display:flex;gap:6px">${hk !== TK ? '<button class="btn ghost sm" data-act="hdate" data-k="">오늘로</button>' : ''}<button class="btn ghost sm" data-act="habitEdit">${U.habitEdit ? '완료' : '편집'}</button></span></div>`;
  if (U.habitEdit) {
    h += P().habits.map(hb => `<div class="hrow"><input id="hname-${hb.id}" data-hid="${hb.id}" class="hname" value="${esc(hb.name)}" aria-label="습관 이름"><button class="xbtn${armed('hdel:' + hb.id) ? ' warn' : ''}" data-act="habitDel" data-id="${esc(hb.id)}">${armed('hdel:' + hb.id) ? '삭제' : '×'}</button></div>`).join('');
    h += `<div class="inline-add" style="margin-top:6px"><input id="habitinput" placeholder="새 습관 이름 (Enter)" autocomplete="off" enterkeyhint="done"><button class="btn sm" data-act="habitAdd">추가</button></div>`;
  } else {
    h += P().habits.map(hb => {
      const done = on.has(hb.id), stk = habitStreak(S, hb.id);
      const wk = [...Array(7)].map((_, i) => { const kk = key(addDays(today, i - 6)); return `<i style="${(S.days[kk]?.habits || []).includes(hb.id) ? 'background:' + w.lv[2] : ''}"></i>`; }).join('');
      return `<div class="hrow" style="--hc:${w.lv[2]}"><button class="chk${done ? ' on' : ''}" style="--c:var(--hc)" data-act="habit" data-id="${esc(hb.id)}" aria-label="${esc(hb.name)} 완료">${I.checkW}</button><div class="txw"><span>${esc(hb.name)}</span><span class="sub">${stk ? stk + '일 연속' : '오늘부터 시작'}</span></div><div class="week7" aria-label="최근 7일">${wk}</div></div>`;
    }).join('') || '<div class="sub">편집을 눌러 습관을 추가해 보세요</div>';
  }
  h += '</div>';
  if (st().showBook) h += bookCard();
  return h + '</div>';
}
const memoBtn = b => `<button class="memobtn${U.bookMemo === b.id ? ' on' : ''}${b.memo ? ' has' : ''}" data-act="bookMemo" data-id="${esc(b.id)}" aria-expanded="${U.bookMemo === b.id}" aria-label="책 메모">${I.note}</button>`;
const memoBox = b => {
  if (U.bookMemo !== b.id) return '';
  const memo = b.memo || '', editing = U.memoEdit === b.id || !memo;
  if (editing) return `<div class="memobox"><textarea id="bk-memo-${esc(b.id)}" data-bid="${esc(b.id)}" class="bkmemo" rows="6" placeholder="인상 깊은 문장, 생각, 줄거리 메모를 자유롭게 적어요">${esc(memo)}</textarea><div class="row"><span class="hint">다른 곳을 누르면 자동으로 저장돼요</span><button class="btn sm" data-act="memoDone" data-id="${esc(b.id)}">완료</button></div></div>`;
  const long = memo.length > 140 || memo.split('\n').length > 4, full = U.memoFull === b.id;
  return `<div class="memobox"><div class="memotext"><div class="mt-in${long && !full ? ' clamp' : ''}">${esc(memo)}</div></div><div class="memoacts">${long ? `<button class="btn ghost sm" data-act="memoFull" data-id="${esc(b.id)}">${full ? '접기' : '펼치기'}</button>` : ''}<button class="btn ghost sm" data-act="memoEdit" data-id="${esc(b.id)}">편집</button></div></div>`;
};
const books = () => P().books || (P().book ? [{ id: 'b0', ...P().book }] : []);
function bookForm(b) {
  return `<div class="card stack" style="background:var(--surface)"><div class="bookform"><label class="full">책 제목<input class="field" id="bk-title" value="${esc(b?.title || '')}" autocomplete="off"></label>
    <label>지금 쪽<input class="field" id="bk-page" type="number" inputmode="numeric" min="0" value="${b?.page ?? 0}"></label>
    <label>전체 쪽<input class="field" id="bk-total" type="number" inputmode="numeric" min="1" value="${b?.total || ''}"></label></div>
    <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">${b ? `<button class="btn danger sm" data-act="bookDel" data-id="${esc(b.id)}">${armed('bdel:' + b.id) ? '한 번 더 누르면 지워져요' : '지우기'}</button>` : ''}<button class="btn ghost sm" data-act="bookEdit" data-id="">취소</button><button class="btn sm" data-act="bookSave" data-id="${esc(b?.id || '')}">저장</button></div></div>`;
}
function bookCard() {
  const all = books(), reading = all.filter(b => !b.done), done = all.filter(b => b.done);
  let h = `<div class="card stack"><div class="row"><span class="lbl b">지금 읽는 책${reading.length > 1 ? ` ${reading.length}권` : ''}</span>${U.bookEdit !== 'new' ? '<button class="btn ghost sm" data-act="bookEdit" data-id="new">+ 책 추가</button>' : ''}</div>`;
  if (U.bookEdit === 'new') h += bookForm(null);
  if (!reading.length && U.bookEdit !== 'new') h += '<div class="sub">읽고 있는 책을 추가해 보세요. 여러 권도 함께 기록할 수 있어요.</div>';
  for (const b of reading) {
    if (U.bookEdit === b.id) { h += bookForm(b); continue; }
    const pct = Math.round(b.page / b.total * 100);
    h += `<div class="bookrow"><div class="cover">${esc(b.title)}</div><div class="binfo"><div class="row" style="align-items:flex-start"><b style="overflow-wrap:anywhere;min-width:0">${esc(b.title)}</b><span style="display:flex;gap:2px;flex:none">${memoBtn(b)}<button class="more" data-act="bookEdit" data-id="${esc(b.id)}" aria-label="책 수정">${I.dots}</button></span></div>
      <div class="row"><span class="sub">p.${b.page} / ${b.total}</span><b>${pct}%</b></div><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div>
      <div class="bk-btns"><button class="btn ghost sm" data-act="book" data-id="${esc(b.id)}" data-v="10">+10쪽</button><button class="btn ghost sm" data-act="book" data-id="${esc(b.id)}" data-v="30">+30쪽</button><button class="btn ghost sm" data-act="book" data-id="${esc(b.id)}" data-v="-10">-10쪽</button></div></div></div>${memoBox(b)}`;
  }
  if (done.length) {
    h += `<button class="sdhead" data-act="booksDone" style="border-top:1px dashed var(--line);padding-top:10px">다 읽은 책 <span class="pill-tag">${done.length}</span><span class="tog">${U.booksDone ? '접기' : '펼치기'}</span></button>`;
    if (U.booksDone) h += done.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).map(b => `<div class="plan-i"><span class="nm">📖 ${esc(b.title)}<br><span class="sub">${b.doneAt ? fmtDay(key(new Date(b.doneAt))) + ' 완독 · ' : ''}${b.total}쪽</span></span>${memoBtn(b)}<button class="btn ghost sm" data-act="bookReopen" data-id="${esc(b.id)}">다시 읽기</button><button class="xbtn${armed('bdel:' + b.id) ? ' warn' : ''}" data-act="bookDel" data-id="${esc(b.id)}" aria-label="삭제">${armed('bdel:' + b.id) ? '삭제' : '×'}</button></div>${memoBox(b)}`).join('');
  }
  return h + '</div>';
}

/* ---------------- alarm tab ---------------- */
function timedRow(k, t) {
  const c = catOf(t.cat);
  return `<div class="row trow" style="--c:var(--${cc(c.color)})"><span><span class="chip sm"><span class="dot"></span>${esc(c.name)}</span><span style="overflow-wrap:anywhere">${esc(t.text)}</span></span><span class="bell">${k === todayKey() ? '오늘' : fromKey(k).getDate() + '일'} ${T(t.time)}</span></div>`;
}
function alarmSection() {
  const a = st().alarms, TK = todayKey(), idx = index();
  const timed = [...idx.keys()].filter(k => k && k >= TK).sort().flatMap(k => idx.get(k).filter(t => t.time && !t.done).map(t => [k, t])).slice(0, 8);
  const perm = U.notif;
  const permCard = perm === 'granted'
    ? `<div class="card row"><div><div class="lbl">알림 허용됨</div><div class="sub">${isNative ? '설정한 시간에 팝업으로 알려드려요' : '이 페이지가 열려 있을 때 알려드려요. 폰에서는 앱 알림을 쓰세요.'}</div></div><button class="btn ghost sm" data-act="notifTest">테스트</button></div>`
    : perm === 'unsupported' ? '<div class="card"><div class="sub">이 브라우저는 알림을 지원하지 않아요.</div></div>'
    : `<div class="card row"><div><div class="lbl">알림이 꺼져 있어요</div><div class="sub">${perm === 'denied' ? (isNative ? '휴대폰 설정 → 앱 → 몽글 투두 → 알림에서 켜 주세요' : '브라우저 주소창의 사이트 설정에서 알림을 허용해 주세요') : '허용해야 팝업 알림을 받을 수 있어요'}</div></div>${perm === 'denied' ? '' : '<button class="btn sm" data-act="notifReq">허용</button>'}</div>`;
  return `${permCard}
    <div class="card stack"><div class="row"><div><div class="lbl">아침 브리핑</div><div class="sub">오늘 할 일 목록을 한 번에 알려줘요</div></div><button class="sw${a.morning.on ? ' on' : ''}" data-act="sw" data-k="morning" aria-label="아침 브리핑"></button></div>
      <div class="row"><span class="sub">알림 시간 · ${T(a.morning.time)}</span><input type="time" class="tinput" id="t-morning" value="${a.morning.time}"></div></div>
    <div class="card stack"><div class="row"><div><div class="lbl">저녁 체크</div><div class="sub">아직 남은 할 일을 알려줘요</div></div><button class="sw${a.evening.on ? ' on' : ''}" data-act="sw" data-k="evening" aria-label="저녁 체크"></button></div>
      <div class="row"><span class="sub">알림 시간 · ${T(a.evening.time)}</span><input type="time" class="tinput" id="t-evening" value="${a.evening.time}"></div></div>
    <div class="card"><div class="row"><div><div class="lbl">소리 없이 팝업만</div><div class="sub">진동·소리 없이 배너로만 표시해요</div></div><button class="sw${a.silent ? ' on' : ''}" data-act="sw" data-k="silent" aria-label="소리 없이"></button></div></div>
    <div class="card stack"><div class="lbl">예정된 할 일 알림</div>
      ${timed.length ? timed.map(([k, t]) => timedRow(k, t)).join('') : '<div class="sub">알림을 단 할 일이 없어요</div>'}
      <div class="hint">할 일의 ⋯ 메뉴에서 알림 시간을 달 수 있어요. 앞으로 7일 안의 알림이 예약돼요.</div></div>`;
}

/* ---------------- settings ---------------- */
function renderSettings() {
  const s = st(), counts = {}; Object.values(S.todos).forEach(t => { counts[t.cat] = (counts[t.cat] || 0) + 1; });
  let h = `${errBar()}<h2 class="title">설정</h2><div class="stack">
    <div class="card row"><div style="min-width:0"><div class="lbl" style="overflow-wrap:anywhere">${esc(S.user?.email || '')}</div><div class="sub">${S.backend.kind === 'local' ? '이 기기에만 저장 중 (로그인 없이 쓰는 모드)' : '로그인됨 · 폰과 PC가 같이 바뀌어요'}</div></div><button class="btn ghost sm" data-act="logout">${armed('logout') ? '정말 로그아웃' : '로그아웃'}</button></div>
    <h3 class="sect">알림</h3>${alarmSection()}<h3 class="sect">꾸미기</h3>
    <div class="card stack"><div class="lbl">테마</div><div class="themes">`;
  h += THEMES.map(t => `<button class="themecard${s.theme === t.id ? ' on' : ''}" data-act="theme" data-v="${t.id}" style="--ta:${t.l}"><span class="tprev"><span class="shape" style="background:var(--ta)"></span><span class="shape" style="background:var(--${t.p[0]})"></span><span class="shape" style="background:var(--${t.p[1]})"></span></span>${t.name}</button>`).join('');
  h += `</div></div><div class="card stack"><div class="lbl">체크 모양</div><div class="shapes">${SHAPES.map(([id, n]) => `<button class="shapebtn${s.shape === id ? ' on' : ''}" data-act="shape" data-v="${id}"><span class="shp-${id}"></span>${n}</button>`).join('')}</div></div>
    <div class="card stack"><div class="lbl">습관 정원</div>${gardenPicker()}</div>
    <div class="card"><div class="row" style="margin-bottom:4px"><span class="lbl">카테고리</span>${U.editCat === 'new' ? '' : '<button class="btn ghost sm" data-act="newcat">+ 추가</button>'}</div><div class="sub" style="margin-bottom:4px">색 점을 누르면 색을, 이름을 누르면 이름을 바꿔요</div>`;
  for (const c of P().cats) {
    h += `<div style="--c:var(--${cc(c.color)})"><div class="catline"><button class="dotbtn" data-act="editcat" data-id="${esc(c.id)}" aria-label="${esc(c.name)} 색 바꾸기"></button><input id="cname-${esc(c.id)}" class="cname" data-cid="${esc(c.id)}" value="${esc(c.name)}" aria-label="카테고리 이름">${S.backend.social?.enabled ? `<div class="seg mini"><button class="${(P().share || []).includes(c.id) ? '' : 'on'}" data-act="share" data-id="${esc(c.id)}" data-v="0">나만</button><button class="${(P().share || []).includes(c.id) ? 'on' : ''}" data-act="share" data-id="${esc(c.id)}" data-v="1">친구 공개</button></div>` : `<span class="sub">${counts[c.id] || 0}개</span>`}<button class="xbtn${armed('cdel:' + c.id) ? ' warn' : ''}" data-act="catdel" data-id="${esc(c.id)}" aria-label="삭제">${armed('cdel:' + c.id) ? '삭제' : '×'}</button></div>`;
    if (U.editCat === c.id) h += `<div class="palette">${COLORS.map(x => `<button class="swatch${c.color === x ? ' on' : ''}" style="--c:var(--${x})" data-act="catcolor" data-id="${esc(c.id)}" data-v="${x}" aria-label="색 ${x}"></button>`).join('')}</div>`;
    h += '</div>';
  }
  if (U.editCat === 'new') {
    h += `<div style="--c:var(--${U.newColor})"><div class="catline"><span class="dotbtn"></span><input id="newcat" class="field" placeholder="새 카테고리 이름" autocomplete="off" enterkeyhint="done"><button class="btn sm" data-act="addcat">추가</button></div>
      <div class="palette">${COLORS.map(x => `<button class="swatch${U.newColor === x ? ' on' : ''}" style="--c:var(--${x})" data-act="catcolor" data-id="new" data-v="${x}" aria-label="색 ${x}"></button>`).join('')}</div></div>`;
  }
  h += `<div class="hint">카테고리를 지워도 그 안의 할 일은 ‘분류 없음’으로 남아요.${S.backend.social?.enabled ? ' ‘친구 공개’로 둔 카테고리의 할 일만 친구가 볼 수 있어요.' : ''}</div></div>
    <div class="card row"><div><div class="lbl">시간 표시</div><div class="sub">예: ${T('14:00')}</div></div><div class="seg"><button class="${s.h24 ? 'on' : ''}" data-act="h24" data-v="1">24시간</button><button class="${s.h24 ? '' : 'on'}" data-act="h24" data-v="0">12시간</button></div></div>
    <div class="card row"><span class="lbl">한 주의 시작</span><div class="seg"><button class="${s.weekStart === 0 ? 'on' : ''}" data-act="ws" data-v="0">일요일</button><button class="${s.weekStart === 1 ? 'on' : ''}" data-act="ws" data-v="1">월요일</button></div></div>
    <div class="card row"><div><div class="lbl">지금 읽는 책 카드</div><div class="sub">습관 탭 아래에 보여요</div></div><button class="sw${s.showBook ? ' on' : ''}" data-act="showBook" aria-label="책 카드"></button></div>
    <div class="card stack"><div><div class="lbl">데이터 백업</div><div class="sub">모든 할 일, 습관, D-day, 설정을 파일 하나로 저장하거나 되돌려요</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="backup"${U.busy ? ' disabled' : ''}>백업 파일 저장</button><button class="btn ghost sm" data-act="restore"${U.busy ? ' disabled' : ''}>백업에서 복원</button></div>
      <input type="file" id="restorefile" accept="application/json,.json" hidden></div>
    <div class="card row"><div><div class="lbl">글꼴 · 다크 모드</div><div class="sub">기기 설정을 따라가요</div></div><span class="sub">v${VERSION}</span></div></div>`;
  return h;
}

/* ---------------- friends ---------------- */
function newRxCard() {
  const un = unseenReactions().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!un.length) return '';
  return `<div class="newrx"><div class="row"><b>새 반응 ${un.length}개</b><button class="btn ghost sm" data-act="seenAll">확인했어요</button></div>
    ${un.slice(0, 5).map(r => `<div class="rxline">${avatarHTML(fprof(r.from).avatar, 22)}<span><b>${esc(fprof(r.from).nickname)}</b>님이 ‘${esc(r.text || '할 일')}’에</span>${stickerHTML(r.sticker, 20)}</div>`).join('')}
    ${un.length > 5 ? `<div class="sub">외 ${un.length - 5}개</div>` : ''}</div>`;
}
const canAdd = () => S.social.friends.length + S.social.outgoing.length < 3;
function profileForm() {
  const pub = S.social.pub, cur = U.pfAvatar || pub?.avatar || 'rabbit';
  return `<div class="card stack"><div class="lbl b">${pub ? '프로필 편집' : '친구들에게 보일 프로필을 만들어요'}</div>
    <div style="display:flex;gap:12px;align-items:center">${avatarHTML(cur, 56)}<input class="field" id="pf-name" maxlength="10" placeholder="닉네임 (10자까지)" value="${esc(pub?.nickname || '')}" autocomplete="off"></div>
    <div class="avpick">${Object.keys(AVATARS).map(k => `<button class="avbtn${cur === k ? ' on' : ''}" data-act="pfAvatar" data-k="${k}">${avatarHTML(k, 44)}${AVATARS[k].name}</button>`).join('')}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end">${pub ? '<button class="btn ghost sm" data-act="editProfile">취소</button>' : ''}<button class="btn sm" data-act="pfSave"${U.busy ? ' disabled' : ''}>${pub ? '저장' : '시작하기'}</button></div>
    ${pub ? '' : '<div class="hint">프로필을 만들면 친구 코드가 생겨요. 할 일은 설정에서 ‘친구 공개’로 둔 카테고리만 보여요.</div>'}</div>`;
}
function friendDay(f) {
  const TK = todayKey(), date = U.fdate || TK, p = fprof(f), day = S.social.day;
  const ready = day && day.key === `${f}|${date}`;
  const todos = ready ? [...day.todos].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const mine = ready ? Object.fromEntries(day.rx.map(r => [r.todoId, r.sticker])) : {};
  const done = todos.filter(t => t.done).length;
  let h = `<div class="card stack"><div class="row"><div style="display:flex;gap:10px;align-items:center;min-width:0">${avatarHTML(p.avatar, 36)}<div style="min-width:0"><b>${esc(p.nickname)}</b>의 하루<div class="sub">${fmtDay(date)}</div></div></div>
    <div style="display:flex;align-items:center"><button class="navbtn" data-act="fnav" data-d="-1" aria-label="전날">${I.left}</button>${date !== TK ? '<button class="pill-tag" data-act="ftoday">오늘</button>' : ''}<button class="navbtn" data-act="fnav" data-d="1" aria-label="다음날">${I.right}</button></div></div>`;
  if (!ready) return h + '<div class="sub">불러오는 중…</div></div>';
  if (day.error) return h + `<div class="sub">${esc(day.error)}</div></div>`;
  h += `<div class="prog"><div class="bar"><i style="width:${todos.length ? done / todos.length * 100 : 0}%"></i></div><span class="sub">${done}/${todos.length}</span></div>`;
  if (!todos.length) h += '<div class="sub">이 날 공개한 할 일이 없어요</div>';
  const cats = p.sharedCats || [], known = new Set(cats.map(c => c.id));
  const groups = cats.map(c => [c, todos.filter(t => t.cat === c.id)]).filter(g => g[1].length);
  const rest = todos.filter(t => !known.has(t.cat));
  if (rest.length) groups.push([{ id: '', name: '기타', color: 'c10' }, rest]);
  for (const [c, items] of groups) {
    h += `<div style="--c:var(--${cc(c.color)})"><span class="chip"><span class="dot"></span>${esc(c.name)}</span><ul class="todos">`;
    for (const t of items) {
      h += `<li class="todo${t.done ? ' done' : ''}"><span class="chk"${t.done ? '' : ''}>${I.checkW}</span><div class="txw"><span class="tx">${esc(t.text)}</span>${mine[t.id] ? `<span class="rx"><span class="rxp mine">${avatarHTML(S.social.pub.avatar, 18)}${stickerHTML(mine[t.id], 16)}</span></span>` : ''}</div><button class="more" data-act="pick" data-id="${esc(t.id)}" aria-label="반응 남기기">${I.smile}</button></li>`;
      if (U.picker === t.id) h += `<li><div class="stpicker">${Object.keys(STICKERS).map(k => `<button class="${mine[t.id] === k ? 'on' : ''}" data-act="react" data-id="${esc(t.id)}" data-k="${k}" aria-label="${STICKERS[k].name}">${stickerHTML(k, 26)}<span>${STICKERS[k].name}</span></button>`).join('')}</div></li>`;
    }
    h += '</ul></div>';
  }
  return h + `<div class="hint">🔒 ${esc(p.nickname)}님이 ‘나만’으로 둔 카테고리는 보이지 않아요</div></div>`;
}
function renderFriends() {
  const so = S.social, B = S.backend.social;
  let h = `${errBar()}<div class="row" style="margin-bottom:14px"><h2 class="title" style="margin:0">친구</h2></div>`;
  if (!B?.enabled) return h + '<div class="card"><div class="sub">친구 기능은 로그인해서 쓸 때만 쓸 수 있어요.</div></div>';
  if (so.error) return h + `<div class="card"><div class="sub">${esc(so.error)}</div></div>`;
  if (so.pub === undefined) return h + '<div class="card"><div class="sub">불러오는 중…</div></div>';
  if (!so.pub || U.editProfile) return h + profileForm();
  h += `<div class="stack"><div class="card me">${avatarHTML(so.pub.avatar, 52)}<div style="flex:1;min-width:0"><div class="nm">${esc(so.pub.nickname)}</div><div class="sub">내 친구 코드 <span class="code">${esc(so.pub.code)}</span></div></div>
    <div style="display:flex;flex-direction:column;gap:6px"><button class="btn ghost sm" data-act="copyCode">코드 복사</button><button class="btn ghost sm" data-act="editProfile">편집</button></div></div>`;
  if (canAdd()) h += `<button class="foldbtn${U.addOpen ? ' open' : ''}" data-act="addOpen" aria-expanded="${U.addOpen}"><span>＋ 친구 추가</span><span class="tog">${U.addOpen ? '접기' : '펼치기'}</span></button>`;
  if (U.addOpen && canAdd()) h += `<div class="card stack fold-body"><div class="inline-add"><input id="codeinput" placeholder="친구 코드 (예: MONG-7K2Q)" autocomplete="off" autocapitalize="characters" enterkeyhint="send"><button class="btn sm" data-act="sendReq"${U.busy ? ' disabled' : ''}>요청</button></div><div class="hint">친구는 최대 3명까지예요. 친구가 요청을 수락하면 서로의 ‘친구 공개’ 할 일이 보여요.</div></div>`;
  if (so.incoming.length) h += `<div class="card stack"><div class="lbl b">받은 친구 요청</div>${so.incoming.map(u => `<div class="row"><span style="display:flex;gap:10px;align-items:center">${avatarHTML(fprof(u).avatar, 32)}${esc(fprof(u).nickname)}</span><span style="display:flex;gap:6px"><button class="btn ghost sm" data-act="decline" data-id="${esc(u)}">거절</button><button class="btn sm" data-act="accept" data-id="${esc(u)}"${so.friends.length >= 3 ? ' disabled' : ''}>수락</button></span></div>`).join('')}</div>`;
  if (so.friends.length) {
    const f = so.friends.includes(U.friend) ? U.friend : so.friends[0];
    h += `<div class="friends">${so.friends.map(u => `<button class="fr${u === f ? ' on' : ''}" data-act="friend" data-id="${esc(u)}">${avatarHTML(fprof(u).avatar, 52)}<span>${esc(fprof(u).nickname)}</span></button>`).join('')}</div>`;
    h += friendDay(f);
  } else if (!so.incoming.length) h += `<div class="card"><div class="sub">아직 친구가 없어요. 내 친구 코드를 알려주거나, 아래 ‘친구 추가’에서 친구 코드로 요청해 보세요.</div></div>`;
  if (so.outgoing.length) h += `<div class="card stack"><div class="lbl b">보낸 요청</div>${so.outgoing.map(u => `<div class="row"><span style="display:flex;gap:10px;align-items:center">${avatarHTML(fprof(u).avatar, 28)}${esc(fprof(u).nickname)} <span class="sub">수락 기다리는 중</span></span><button class="btn ghost sm" data-act="cancelReq" data-id="${esc(u)}">취소</button></div>`).join('')}</div>`;
  if (so.friends.length) h += `<button class="foldbtn${U.manageOpen ? ' open' : ''}" data-act="manageOpen" aria-expanded="${!!U.manageOpen}"><span>친구 관리</span><span class="tog">${U.manageOpen ? '접기' : '펼치기'}</span></button>`;
  if (so.friends.length && U.manageOpen) h += `<div class="card stack fold-body">${so.friends.map(u => `<div class="row"><span style="display:flex;gap:10px;align-items:center">${avatarHTML(fprof(u).avatar, 28)}${esc(fprof(u).nickname)}</span><button class="xbtn${armed('unf:' + u) ? ' warn' : ''}" data-act="unfriend" data-id="${esc(u)}" style="font-size:12px">${armed('unf:' + u) ? '정말 끊기' : '친구 끊기'}</button></div>`).join('')}</div>`;
  return h + '</div>';
}
async function sendRequest() {
  const so = S.social, B = S.backend.social;
  let code = ($('codeinput')?.value || '').trim().toUpperCase().replace(/\s/g, '');
  if (!code) { toast('친구 코드를 입력해 주세요'); return; }
  if (!code.startsWith('MONG-')) code = 'MONG-' + code.replace(/^MONG/, '');
  if (code === so.pub.code) { toast('내 코드예요'); return; }
  U.busy = true; requestRender();
  try {
    const to = await B.lookupCode(code);
    if (!to) toast('그 코드를 가진 친구가 없어요');
    else if (so.friends.includes(to)) toast('이미 친구예요');
    else if (so.incoming.includes(to)) toast('그 친구가 먼저 요청을 보냈어요. 받은 요청에서 수락해 주세요');
    else if (!canAdd()) toast('친구는 최대 3명까지예요');
    else { await B.sendRequest(to); clearDraft('codeinput'); U.addOpen = false; toast('친구 요청을 보냈어요'); }
  } catch (e) { console.error(e); toast('요청을 보내지 못했어요'); }
  U.busy = false; requestRender();
}
async function saveFriendProfile() {
  const B = S.backend.social, name = ($('pf-name')?.value || '').trim().slice(0, 10);
  if (!name) { toast('닉네임을 입력해 주세요'); return; }
  const avatar = U.pfAvatar || S.social.pub?.avatar || 'rabbit';
  U.busy = true; requestRender();
  try {
    let code = S.social.pub?.code;
    for (let i = 0; !code && i < 5; i++) {
      const c = 'MONG-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
      try { await B.claimCode(c); code = c; } catch { /* taken, try another */ }
    }
    if (!code) throw new Error('code');
    await B.savePublicProfile({ nickname: name, avatar, code, sharedCats: sharedCats() });
    S.social.pub = { ...(S.social.pub || {}), nickname: name, avatar, code, sharedCats: sharedCats() };
    U.editProfile = false; U.pfAvatar = null; clearDraft('pf-name');
    toast('프로필을 저장했어요');
  } catch (e) { console.error(e); toast('프로필을 저장하지 못했어요'); }
  U.busy = false; requestRender();
}

/* ---------------- web layout parts ---------------- */
function webSide() {
  const k = U.selected, TK = todayKey();
  return `<div class="brand"><span class="logo"></span>몽글 투두</div>
    <nav class="snav">${NAV.map(([id, l, ic]) => `<button class="${U.tab === id ? 'on' : ''}" data-tab="${id}">${ic}${l}${navBadge(id)}</button>`).join('')}</nav>
    <div class="minical"><div class="hd">${monthNav('month')}</div><div class="cal">${calCells(k, 'month')}</div></div>
    <div><div class="slabel">오늘 남은 할 일</div>${P().cats.map(c => `<div class="scat" style="--c:var(--${cc(c.color)})"><span class="dot"></span>${esc(c.name)}<span class="cnt">${todosOn(TK).filter(t => t.cat === c.id && !t.done).length}</span></div>`).join('')}</div>`;
}
function webMain() {
  const k = U.selected;
  if (U.tab !== 'todo') return `<div class="inner">${U.tab === 'habit' ? renderHabit(true) : U.tab === 'friends' ? renderFriends() : renderSettings()}</div>`;
  return `${errBar()}${ddayStrip()}<div class="whd"><h2>${fmtDay(k)}</h2>${k !== todayKey() ? '<button class="btn ghost sm" data-act="today">오늘로</button>' : ''}
    <div class="month" style="font-size:15px"><button class="navbtn" data-act="nav" data-view="week" data-d="-1" aria-label="지난주">${I.left}</button><button class="navbtn" data-act="nav" data-view="week" data-d="1" aria-label="다음 주">${I.right}</button></div></div>
    <div class="cal big">${calCells(k, 'week')}</div>${newRxCard()}
    <div class="wcats">${P().cats.map(c => `<div class="wcat" style="--c:var(--${cc(c.color)})">${catBlock(c, k)}</div>`).join('')}${orphanBlock(k) ? `<div class="wcat">${orphanBlock(k)}</div>` : ''}</div>${somedayBlock()}`;
}
function webRight() {
  const k = U.selected, a = todosOn(k), dn = a.filter(t => t.done).length, p = a.length ? dn / a.length : 0, C = 2 * Math.PI * 46;
  const timed = a.filter(t => t.time && !t.done).sort((x, y) => x.time.localeCompare(y.time));
  const hon = habitsOn(S, k).length;
  return `<div class="card ringwrap"><svg viewBox="0 0 120 120" width="120" height="120" aria-label="달성률"><circle cx="60" cy="60" r="46" style="fill:none;stroke:var(--line);stroke-width:12"/>
      <circle cx="60" cy="60" r="46" transform="rotate(-90 60 60)" style="fill:none;stroke:var(--accent);stroke-width:12;stroke-linecap:round" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}"/>
      <text x="60" y="68" text-anchor="middle" style="fill:var(--ink);font-weight:700;font-size:24px">${Math.round(p * 100)}%</text></svg>
      <div class="sub">${a.length}개 중 ${dn}개 완료 · 습관 ${hon}/${P().habits.length}</div></div>
    <div class="card stack"><div class="row"><span class="lbl">오늘의 기분</span>${moodBtn(k)}</div>
      <input class="memo" id="memo" style="margin-top:0" placeholder="한 줄 일기를 남겨보세요" value="${esc(S.days[k]?.memo || '')}" autocomplete="off"></div>
    <div class="card stack"><div class="lbl">알림 예정</div>${timed.length ? timed.map(t => timedRow(k, t)).join('') : '<div class="sub">알림을 단 할 일이 없어요</div>'}</div>`;
}

/* ---------------- sheets ---------------- */
let lastSheetKey = '';
const setHTML = (el, html) => { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } };
function sheetHTML() {
  const wide = layout === 'web';
  const sk = U.ddsheet ? 'dd' : (U.sheet || ''), anim = sk !== lastSheetKey ? ' anim' : '';
  lastSheetKey = sk;
  const wrap = (label, inner) => `<div class="scrim${wide ? ' center' : ''}" data-act="close"><div class="sheet${anim}" role="dialog" aria-label="${label}"><div class="grab"></div>${inner}</div></div>`;
  if (U.ddsheet) {
    const ds = [...P().ddays].sort((a, b) => a.date.localeCompare(b.date));
    return wrap('D-day 관리', `<h3 class="title" style="margin:0">D-day</h3>
      ${ds.map(x => `<div class="plan-i"><button class="pin${x.pin ? ' on' : ''}" data-act="pin" data-id="${esc(x.id)}" aria-label="상단 고정">★</button><span class="nm">${esc(x.name)}<br><span class="sub">${fmtDay(x.date)}</span></span><span class="dpill">${ddLabel(x.date)}</span><button class="xbtn${armed('dd:' + x.id) ? ' warn' : ''}" data-act="ddel" data-id="${esc(x.id)}" aria-label="삭제">${armed('dd:' + x.id) ? '삭제' : '×'}</button></div>`).join('') || '<div class="sub">아직 D-day가 없어요</div>'}
      <div class="inline-add" style="flex-wrap:wrap"><input id="ddname" placeholder="D-day 이름" autocomplete="off" enterkeyhint="done"><input type="date" class="finput" id="dddate" value="${addKey(todayKey(), 30)}"><button class="btn sm" data-act="ddadd">추가</button></div>
      <div class="hint">★ 를 켠 D-day가 할 일 화면 맨 위에 보여요.</div>
      <div class="sheetfoot" style="justify-content:flex-end"><button class="btn sm" data-act="done">완료</button></div>`);
  }
  if (!U.sheet) return '';
  const t = S.todos[U.sheet];
  if (!t) { U.sheet = null; return ''; }
  const c = catOf(t.cat), r = t.routineId && S.routines[t.routineId], TK = todayKey();
  const q = [[0, '오늘'], [1, '내일'], [7, '다음 주']];
  return wrap('할 일 메뉴', `
    <input class="sheettitle" id="sheettext" value="${esc(t.text)}" aria-label="할 일 이름" autocomplete="off" enterkeyhint="done">
    <div class="sf"><span class="slbl">${I.tag}카테고리</span><div class="quick">${P().cats.map(x => `<button class="qb${x.id === t.cat ? ' on' : ''}" style="--c:var(--${cc(x.color)})" data-act="sheetcat" data-v="${x.id}"><span class="chip sm" style="border:0;background:none;padding:0;gap:5px"><span class="dot"></span>${esc(x.name)}</span></button>`).join('')}</div></div>
    <div class="sf"><span class="slbl">${I.cal}날짜 · ${t.date ? fmtDay(t.date) : '언젠가'}</span>
      <div class="quick">${q.map(([v, l]) => `<button class="qb${t.date === addKey(TK, v) ? ' on' : ''}" data-act="moveto" data-v="${v}">${l}</button>`).join('')}
      <input type="date" class="finput" id="sheetdate" value="${t.date}" aria-label="날짜 직접 선택"><button class="qb${t.date ? '' : ' on'}" data-act="tosomeday">언젠가</button></div></div>
    ${t.date ? `<div class="sf"><span class="slbl">${I.bell}알림 시간${t.time ? ' · ' + T(t.time) : ''}</span>
      <div class="quick"><input type="time" class="finput" id="sheettime" value="${t.time || ''}">${t.time ? '<button class="qb" data-act="notime">알림 끄기</button>' : ''}</div></div>
    <div class="sf"><span class="slbl">${I.repeat}반복</span><div class="quick">${REPEATS.map(([v, l]) => `<button class="qb${(r ? r.rule : '') === v ? ' on' : ''}" data-act="repeat" data-v="${v}">${l}</button>`).join('')}</div>
      ${r ? '<span class="hint">이름·시간을 바꾸면 앞으로의 반복에도 같이 바뀌어요.</span>' : ''}</div>` : ''}
    <div class="sf" style="--c:var(--${cc(c.color)})"><span class="slbl">${I.list}하위 할 일</span>
      <ul class="todos" style="margin:0">${(t.subs || []).map(s => `<li class="sub-i${s.done ? ' done' : ''}"><button class="chk sm${s.done ? ' on' : ''}" data-act="subtoggle" data-id="${esc(t.id)}" data-s="${esc(s.id)}" aria-label="하위 할 일 완료">${I.checkW}</button><span style="flex:1">${esc(s.text)}</span><button class="xbtn" data-act="subdel" data-s="${esc(s.id)}" aria-label="하위 할 일 삭제">×</button></li>`).join('')}</ul>
      <div class="subadd"><span class="chk sm" style="opacity:.4"></span><input id="subinput" placeholder="하위 할 일 추가 후 Enter" autocomplete="off" enterkeyhint="done"></div></div>
    <div class="sheetfoot"><button class="btn danger sm" data-act="del">${armed('del:' + t.id) ? '한 번 더 누르면 삭제' : '삭제'}</button><button class="btn sm" data-act="done">완료</button></div>`);
}

/* ---------------- login & splash ---------------- */
const splashHTML = () => '<div class="splash"><span class="logo"></span></div>';
function loginHTML() {
  return `<div class="login"><form class="box" id="loginform" autocomplete="on">
    <span class="logo"></span><h1>몽글 투두</h1><div class="sub">Firebase에서 만든 계정으로 로그인해요</div>
    <input id="lg-email" type="email" placeholder="이메일" autocomplete="username" required>
    <input id="lg-pw" type="password" placeholder="비밀번호" autocomplete="current-password" required>
    <div class="err">${esc(U.loginErr)}</div>
    <button class="btn" type="submit"${U.busy ? ' disabled' : ''}>${U.busy ? '로그인 중…' : '로그인'}</button>
    <button class="linkbtn" type="button" data-act="resetpw">비밀번호를 잊었어요</button></form></div>`;
}

/* ---------------- render ---------------- */
const drafts = {};
const NO_DRAFT = new Set(['memo', 'pf-name-x', 'sheetdate', 'sheettime', 't-morning', 't-evening', 'dddate', 'lg-email', 'lg-pw']);
const clearDraft = (...ids) => ids.forEach(i => delete drafts[i]);
let layout = null;
const root = () => document.getElementById('app');
export function renderAll() {
  const want = !S.authReady ? 'splash' : !S.user ? 'login' : !S.synced && !Object.keys(S.todos).length ? 'splash' : (innerWidth >= 960 ? 'web' : 'phone');
  const ae = document.activeElement, focusId = ae && ae.id && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') ? ae.id : null;
  const sel = focusId ? [ae.selectionStart, ae.selectionEnd, ae.value] : null;
  if (want !== layout) {
    layout = want;
    root().innerHTML = want === 'splash' ? splashHTML() : want === 'login' ? loginHTML()
      : want === 'web' ? '<div class="web" id="web"><aside class="side" id="wside"></aside><main class="wmain" id="wmain"></main><aside class="wright" id="wright"></aside></div><div id="ov"></div>'
      : '<div class="phone-l"><main class="screen" id="scr"></main><nav class="tabbar" id="tabs"></nav><div id="ov"></div></div>';
  }
  if (want === 'login') { const f = root().querySelector('.err'); if (f) f.textContent = U.loginErr; const b = root().querySelector('button[type=submit]'); if (b) { b.disabled = U.busy; b.textContent = U.busy ? '로그인 중…' : '로그인'; } return; }
  if (want === 'splash') return;
  if (want === 'phone') {
    setHTML($('scr'), U.tab === 'todo' ? renderTodo() : U.tab === 'habit' ? renderHabit(false) : U.tab === 'friends' ? renderFriends() : renderSettings());
    setHTML($('tabs'), NAV.map(([id, l, ic]) => `<button class="tab${U.tab === id ? ' on' : ''}" data-tab="${id}">${ic}${l}${navBadge(id)}</button>`).join(''));
  } else {
    $('web').className = 'web' + (U.tab === 'todo' ? '' : ' notodo');
    setHTML($('wside'), webSide());
    setHTML($('wmain'), webMain());
    $('wright').hidden = U.tab !== 'todo';
    if (U.tab === 'todo') setHTML($('wright'), webRight());
  }
  const sh = sheetHTML(); if (!sh) lastSheetKey = ''; setHTML($('ov'), sh);
  if (focusId) {
    const el = $(focusId);
    if (el && el !== document.activeElement) {
      if (sel[2] !== undefined && el.value !== sel[2] && !['sheetdate', 'sheettime', 't-morning', 't-evening'].includes(focusId)) el.value = sel[2];
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(sel[0], sel[1]); } catch { /* not a text input */ }
    }
  }
  for (const id of Object.keys(drafts)) { const el = $(id); if (!el) delete drafts[id]; else if (el.value !== drafts[id]) el.value = drafts[id]; }
  if (U.focusMemo) { const m = document.querySelector('.bkmemo'); if (m) { m.focus({ preventScroll: true }); m.setSelectionRange(m.value.length, m.value.length); } U.focusMemo = null; }
  if (U.focusAdd) { const ai = $('addinput'); if (ai) { ai.focus({ preventScroll: true }); U.focusAdd = false; } }
}
const $ = id => document.getElementById(id);

/* ---------------- toast / banner ---------------- */
let toastT;
export function toast(m) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; t.setAttribute('role', 'status');
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2000);
}
let banT;
export function banner(title, body) {
  document.querySelector('.banner')?.remove();
  const b = document.createElement('div'); b.className = 'banner'; b.setAttribute('role', 'alert');
  b.innerHTML = `<div class="ic"><span></span></div><div style="min-width:0;flex:1"><div class="meta2">몽글 투두 · 지금</div><b>${esc(title)}</b><p>${esc(body)}</p></div>`;
  b.onclick = () => b.remove();
  document.body.appendChild(b); clearTimeout(banT); banT = setTimeout(() => b.remove(), 6000);
}

/* ---------------- events ---------------- */
function selectDate(k) {
  U.selected = k; U.adding = null;
  if (k > todayKey()) ensureRoutines(todayKey(), k > addKey(todayKey(), 60) ? k : addKey(k, 7));
  if (S.loadedFrom && k < S.loadedFrom) ensureLoaded(key(new Date(fromKey(k).getFullYear(), fromKey(k).getMonth() - 1, 1)));
}
function addHabit() {
  const i = $('habitinput'), v = i ? i.value.trim() : '';
  if (!v) return;
  saveProfile({ habits: [...P().habits, { id: 'h-' + uid(), name: v }] });
  i.value = ''; clearDraft('habitinput');
}
function addCat() {
  const i = $('newcat'), v = i ? i.value.trim() : '';
  if (!v) { toast('카테고리 이름을 입력해 주세요'); return; }
  saveProfile({ cats: [...P().cats, { id: 'c-' + uid(), name: v, color: U.newColor }] });
  U.editCat = null; clearDraft('newcat'); toast(`‘${v}’ 카테고리를 만들었어요`);
}
function addDday() {
  const n = $('ddname').value.trim(), d = $('dddate').value;
  if (!n || !d) { toast('이름과 날짜를 넣어 주세요'); return; }
  saveProfile({ ddays: [...P().ddays, { id: uid(), name: n, date: d, pin: true }] });
  clearDraft('ddname'); $('ddname').value = '';
  toast(`${ddLabel(d)} ${n} 추가했어요`);
}
export async function refreshNotif() { U.notif = await notifPermission(); requestRender(); }

async function doBackup() {
  U.busy = true; requestRender();
  try {
    const all = await S.backend.fetchAll();
    const data = { app: 'mongle-todo', version: 1, exportedAt: new Date().toISOString(), profile: S.profile, ...all };
    await saveBackup(`mongle-backup-${todayKey()}.json`, JSON.stringify(data, null, 1));
    toast('백업 파일을 만들었어요');
  } catch (e) { console.error(e); toast('백업하지 못했어요'); }
  U.busy = false; requestRender();
}
async function doRestore(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'mongle-todo') { toast('몽글 투두 백업 파일이 아니에요'); return; }
    U.busy = true; requestRender();
    await S.backend.restore(data);
    toast(`복원했어요 (할 일 ${(data.todos || []).length}개)`);
  } catch (e) { console.error(e); toast('복원하지 못했어요. 파일을 확인해 주세요'); }
  U.busy = false; requestRender();
}

export function bindEvents(hooks) {
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]');
    if (tb) { U.addOpen = false; U.manageOpen = false; U.tab = tb.dataset.tab; U.adding = null; U.sheet = null; U.ddsheet = false; U.arm = null; U.gardenPick = false; const sc = $('scr') || $('wmain'); if (sc) sc.scrollTop = 0; if (U.tab === 'set') refreshNotif(); requestRender(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) { if (U.arm) { U.arm = null; requestRender(); } return; }
    const a = el.dataset.act, id = el.dataset.id, v = el.dataset.v;
    if (a === 'close' && e.target !== el) return;
    const prevArm = U.arm; U.arm = null;
    const arm = k => { if (prevArm === k) return true; U.arm = k; return false; };
    const sheetT = () => S.todos[U.sheet];
    switch (a) {
      case 'sel': selectDate(el.dataset.k); break;
      case 'view': U.view = v; break;
      case 'nav': { const d = fromKey(U.selected), n = +el.dataset.d, vw = el.dataset.view || U.view; selectDate(key(vw === 'week' ? addDays(d, 7 * n) : new Date(d.getFullYear(), d.getMonth() + n, 1))); break; }
      case 'today': selectDate(todayKey()); break;
      case 'toggle': toggleTodo(id); break;
      case 'subtoggle': { const t = S.todos[id]; if (t) putTodo({ ...t, subs: t.subs.map(s => s.id === el.dataset.s ? { ...s, done: !s.done } : s) }); break; }
      case 'subdel': { const t = sheetT(); if (t) putTodo({ ...t, subs: t.subs.filter(s => s.id !== el.dataset.s) }); break; }
      case 'more': U.sheet = id; U.ddsheet = false; break;
      case 'close': case 'done': U.sheet = null; U.ddsheet = false; break;
      case 'add': U.adding = U.adding === el.dataset.cat ? null : el.dataset.cat; U.focusAdd = !!U.adding; break;
      case 'mood': { const k = U.selected, m = S.days[k]?.mood, i = MOODS.indexOf(m); putDay(k, { mood: i === MOODS.length - 1 ? '' : MOODS[i + 1] }); break; }
      case 'sheetcat': { const t = sheetT(); if (t) updateTodo(t.id, { cat: v }, { future: true }); break; }
      case 'moveto': { const t = sheetT(); if (t) { const nk = addKey(todayKey(), +v); U.sheet = moveTodo(t.id, nk) || t.id; toast(`${fmtDay(nk)}로 옮겼어요`); } break; }
      case 'tosomeday': { const t = sheetT(); if (t && t.date) { U.sheet = moveTodo(t.id, '') || t.id; U.sdOpen = true; toast('언젠가 할 일로 옮겼어요'); } break; }
      case 'notime': { const t = sheetT(); if (t) updateTodo(t.id, { time: '' }, { future: true }); break; }
      case 'repeat': { const t = sheetT(); if (t) { setRepeat(t.id, v); toast(v ? `${repName(v)} 반복으로 설정했어요` : '반복을 껐어요'); } break; }
      case 'del': { const t = sheetT(); if (t && arm('del:' + t.id)) { deleteTodo(t.id); U.sheet = null; toast('삭제했어요'); } break; }
      case 'ddsheet': U.ddsheet = true; U.sheet = null; break;
      case 'ddel': if (arm('dd:' + id)) saveProfile({ ddays: P().ddays.filter(d => d.id !== id) }); break;
      case 'ddadd': addDday(); break;
      case 'pin': saveProfile({ ddays: P().ddays.map(d => d.id === id ? { ...d, pin: !d.pin } : d) }); break;
      case 'sdtoggle': U.sdOpen = !U.sdOpen; break;
      case 'schedule': moveTodo(id, U.selected); toast(`${fmtDay(U.selected)}로 옮겼어요`); break;
      case 'habit': { const k = U.hdate || todayKey(); toggleHabit(k, id); const total = P().habits.length; if (habitsOn(S, k).length === total && total) toast(isSpecial(S, k) ? `${gardenOf(st()).unit}을(를) 만났어요!` : '습관을 모두 끝냈어요'); break; }
      case 'hdate': U.hdate = el.dataset.k && el.dataset.k !== todayKey() ? el.dataset.k : null; break;
      case 'habitEdit': U.habitEdit = !U.habitEdit; break;
      case 'habitDel': if (arm('hdel:' + id)) saveProfile({ habits: P().habits.filter(h => h.id !== id) }); break;
      case 'habitAdd': addHabit(); break;
      case 'book': { const list = books(), b = list.find(x => x.id === id); if (b) { const page = Math.max(0, Math.min(b.total, b.page + +v)), fin = page === b.total; saveProfile({ books: list.map(x => x.id === id ? { ...x, page, done: fin, doneAt: fin ? Date.now() : null } : x), book: null }); if (fin) toast(`‘${b.title}’ 다 읽었어요! 다 읽은 책으로 옮겼어요`); } break; }
      case 'bookEdit': U.bookEdit = id || null; clearDraft('bk-title', 'bk-page', 'bk-total'); break;
      case 'bookSave': {
        const title = $('bk-title').value.trim(), total = Math.max(1, +$('bk-total').value || 0), page = Math.max(0, Math.min(total, +$('bk-page').value || 0));
        if (!title || !+$('bk-total').value) { toast('제목과 전체 쪽수를 넣어 주세요'); break; }
        const list = books(), fin = page === total;
        const nb = { title, page, total, done: fin, doneAt: fin ? Date.now() : null };
        saveProfile({ books: id ? list.map(x => x.id === id ? { ...x, ...nb } : x) : [...list, { id: uid(), ...nb }], book: null });
        U.bookEdit = null; clearDraft('bk-title', 'bk-page', 'bk-total'); break;
      }
      case 'bookDel': if (arm('bdel:' + id)) { saveProfile({ books: books().filter(x => x.id !== id), book: null }); U.bookEdit = null; } break;
      case 'bookReopen': saveProfile({ books: books().map(x => x.id === id ? { ...x, done: false, doneAt: null, page: 0 } : x), book: null }); toast('다시 읽기 시작해요'); break;
      case 'booksDone': U.booksDone = !U.booksDone; break;
      case 'bookMemo': U.bookMemo = U.bookMemo === id ? null : id; U.memoEdit = null; U.memoFull = null; break;
      case 'memoEdit': U.memoEdit = id; U.focusMemo = id; break;
      case 'memoDone': U.memoEdit = null; break;
      case 'memoFull': U.memoFull = U.memoFull === id ? null : id; break;
      case 'gardenPick': U.gardenPick = !U.gardenPick; break;
      case 'garden': saveSettings({ garden: v }); U.gardenPick = false; break;
      case 'theme': saveSettings({ theme: v }); break;
      case 'shape': saveSettings({ shape: v }); break;
      case 'h24': saveSettings({ h24: v === '1' }); break;
      case 'ws': saveSettings({ weekStart: +v }); break;
      case 'showBook': saveSettings({ showBook: !st().showBook }); break;
      case 'sw': { const al = JSON.parse(JSON.stringify(st().alarms)); if (el.dataset.k === 'silent') al.silent = !al.silent; else al[el.dataset.k].on = !al[el.dataset.k].on; saveSettings({ alarms: al }); break; }
      case 'editcat': U.editCat = U.editCat === id ? null : id; break;
      case 'newcat': U.editCat = 'new'; break;
      case 'catcolor': if (id === 'new') U.newColor = v; else saveProfile({ cats: P().cats.map(c => c.id === id ? { ...c, color: v } : c) }); break;
      case 'addcat': addCat(); break;
      case 'catdel': if (arm('cdel:' + id)) { if (P().cats.length <= 1) toast('카테고리는 하나 이상 있어야 해요'); else saveProfile({ cats: P().cats.filter(c => c.id !== id) }); } break;
      case 'notifReq': requestNotifPermission().then(() => { refreshNotif(); hooks.reschedule(); }); return;
      case 'notifTest': testNotification(st().alarms.silent).then(ok => toast(ok ? (isNative ? '3초 뒤에 테스트 알림이 와요' : '테스트 알림을 보냈어요') : '알림 권한이 필요해요')); return;
      case 'backup': doBackup(); return;
      case 'restore': $('restorefile').click(); return;
      case 'logout': if (arm('logout')) { S.backend.logout(); } break;
      case 'resetpw': { const em = $('lg-email').value.trim(); if (!em) { U.loginErr = '이메일을 먼저 입력해 주세요'; } else { S.backend.resetPassword(em).then(() => { U.loginErr = '비밀번호 재설정 메일을 보냈어요'; requestRender(); }).catch(() => { U.loginErr = '메일을 보내지 못했어요'; requestRender(); }); } break; }
      case 'seenAll': { const un = unseenReactions(); un.forEach(r => { r.seen = true; }); S.backend.social?.markSeen(un.map(r => r.id)).catch(e => console.error(e)); break; }
      case 'friend': U.friend = id; U.picker = null; break;
      case 'fnav': U.fdate = addKey(U.fdate || todayKey(), +el.dataset.d); U.picker = null; break;
      case 'ftoday': U.fdate = null; U.picker = null; break;
      case 'pick': U.picker = U.picker === id ? null : id; break;
      case 'react': {
        const day = S.social.day, f = day?.key.split('|')[0], t = day?.todos.find(x => x.id === id); if (!t) break;
        const cur = day.rx.find(r => r.todoId === id);
        if (cur && cur.sticker === el.dataset.k) { day.rx = day.rx.filter(r => r !== cur); S.backend.social.unreact(f, id).catch(e => { console.error(e); toast('반응을 지우지 못했어요'); }); }
        else { day.rx = [...day.rx.filter(r => r.todoId !== id), { todoId: id, sticker: el.dataset.k }]; S.backend.social.react(f, t, el.dataset.k).then(() => toast(`${fprof(f).nickname}님에게 ‘${STICKERS[el.dataset.k].name}’ 반응을 남겼어요`)).catch(e => { console.error(e); toast('반응을 남기지 못했어요'); }); }
        U.picker = null; break;
      }
      case 'addOpen': U.addOpen = !U.addOpen; break;
      case 'manageOpen': U.manageOpen = !U.manageOpen; break;
      case 'sendReq': sendRequest(); return;
      case 'accept': S.backend.social.acceptRequest(id).then(() => toast(`${fprof(id).nickname}님과 친구가 됐어요`)).catch(e => { console.error(e); toast('수락하지 못했어요'); }); break;
      case 'decline': S.backend.social.declineRequest(id).catch(e => console.error(e)); break;
      case 'cancelReq': S.backend.social.cancelRequest(id).catch(e => console.error(e)); break;
      case 'unfriend': if (arm('unf:' + id)) { S.backend.social.removeFriend(id).then(() => toast('친구를 끊었어요')).catch(e => { console.error(e); toast('친구를 끊지 못했어요'); }); } break;
      case 'copyCode': { const c = S.social.pub?.code || ''; (navigator.clipboard?.writeText(c) || Promise.reject()).then(() => toast('친구 코드를 복사했어요')).catch(() => toast(`내 코드: ${c}`)); return; }
      case 'editProfile': U.editProfile = !U.editProfile; U.pfAvatar = null; break;
      case 'pfAvatar': U.pfAvatar = el.dataset.k; break;
      case 'pfSave': saveFriendProfile(); return;
      case 'share': setShare(id, v === '1'); toast(v === '1' ? '친구에게 이 카테고리를 보여줘요' : '이 카테고리는 나만 봐요'); break;
      case 'clearerr': S.error = ''; break;
    }
    requestRender();
  });

  document.addEventListener('submit', async e => {
    if (e.target.id !== 'loginform') return;
    e.preventDefault();
    U.busy = true; U.loginErr = ''; requestRender();
    try { await S.backend.login($('lg-email').value.trim(), $('lg-pw').value); }
    catch (err) {
      const c = err.code || '';
      U.loginErr = c.includes('invalid') || c.includes('wrong-password') || c.includes('user-not-found') ? '이메일이나 비밀번호가 맞지 않아요'
        : c.includes('too-many') ? '시도가 너무 많았어요. 잠시 후 다시 해 주세요' : c.includes('network') ? '인터넷 연결을 확인해 주세요' : '로그인하지 못했어요 (' + c + ')';
    }
    U.busy = false; requestRender();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    if (e.isComposing || e.keyCode === 229) return;
    const id = e.target.id, v = (e.target.value || '').trim();
    if (id === 'addinput') { e.preventDefault(); if (e.key === 'Enter' && v) { addTodo(U.selected, U.adding, v); e.target.value = ''; clearDraft(id); U.focusAdd = true; } else if (e.key === 'Escape' || !v) U.adding = null; requestRender(); }
    else if (id === 'subinput' && e.key === 'Enter' && v) { const t = S.todos[U.sheet]; if (t) putTodo({ ...t, subs: [...(t.subs || []), { id: uid(), text: v, done: false }] }); e.target.value = ''; clearDraft(id); }
    else if (id === 'somedayinput' && e.key === 'Enter' && v) { addTodo('', P().cats[0]?.id || '', v); e.target.value = ''; clearDraft(id); }
    else if (id === 'newcat' && e.key === 'Enter') { addCat(); requestRender(); }
    else if (id === 'habitinput' && e.key === 'Enter') addHabit();
    else if (id === 'ddname' && e.key === 'Enter') { addDday(); requestRender(); }
    else if (id === 'codeinput' && e.key === 'Enter') sendRequest();
    else if (e.key === 'Enter' && (id === 'sheettext' || e.target.classList.contains('cname') || e.target.classList.contains('hname'))) e.target.blur();
    else if (e.key === 'Escape' && (U.sheet || U.ddsheet)) { U.sheet = null; U.ddsheet = false; requestRender(); }
  });

  document.addEventListener('focusout', e => {
    if (e.target.id !== 'addinput') return;
    const v = e.target.value.trim(), cat = U.adding;
    setTimeout(() => {
      if (document.activeElement && document.activeElement.id === 'addinput') return;
      if (v && cat) addTodo(U.selected, cat, v);
      if (U.adding === cat) U.adding = null;
      requestRender();
    }, 150);
  });

  document.addEventListener('input', e => {
    if (e.target.id && !NO_DRAFT.has(e.target.id) && e.target.type !== 'file') drafts[e.target.id] = e.target.value;
    if (e.target.id === 'memo') { const k = U.selected, v = e.target.value; later(() => putDay(k, { memo: v })); }
  });

  document.addEventListener('change', e => {
    const id = e.target.id, v = e.target.value;
    if (id === 'sheettext' || e.target.classList.contains('cname') || e.target.classList.contains('hname')) clearDraft(id);
    const t = S.todos[U.sheet];
    if (id === 'sheettime' && t) { updateTodo(t.id, { time: v }, { future: true }); if (v) toast(`${T(v)}에 알려드릴게요`); }
    else if (id === 'sheetdate' && t && v) { U.sheet = moveTodo(t.id, v) || t.id; toast(`${fmtDay(v)}로 옮겼어요`); }
    else if (id === 'sheettext' && t && v.trim() && v.trim() !== t.text) updateTodo(t.id, { text: v.trim() }, { future: true });
    else if (id === 't-morning' || id === 't-evening') { const al = JSON.parse(JSON.stringify(st().alarms)); al[id === 't-morning' ? 'morning' : 'evening'].time = v; saveSettings({ alarms: al }); }
    else if (e.target.classList.contains('cname')) { const nv = v.trim(); if (nv) saveProfile({ cats: P().cats.map(c => c.id === e.target.dataset.cid ? { ...c, name: nv } : c) }); }
    else if (e.target.classList.contains('hname')) { const nv = v.trim(); if (nv) saveProfile({ habits: P().habits.map(h => h.id === e.target.dataset.hid ? { ...h, name: nv } : h) }); }
    else if (id === 'restorefile' && e.target.files[0]) doRestore(e.target.files[0]);
    else if (e.target.classList.contains('bkmemo')) { const bid = e.target.dataset.bid, list = books(); if (list.some(x => x.id === bid && (x.memo || '') !== v)) { saveProfile({ books: list.map(x => x.id === bid ? { ...x, memo: v.slice(0, 5000) } : x), book: null }); toast('메모를 저장했어요'); } clearDraft(id); }
    else return;
    requestRender();
  });

  // Only re-render when the layout (phone vs wide) actually changes; the soft keyboard also fires resize.
  let rt, wideNow = innerWidth >= 960; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if ((innerWidth >= 960) !== wideNow) { wideNow = innerWidth >= 960; requestRender(); } }, 150); });
}

export function handleBack() {
  if (U.sheet || U.ddsheet) { U.sheet = null; U.ddsheet = false; requestRender(); return true; }
  if (U.adding) { U.adding = null; requestRender(); return true; }
  if (U.tab !== 'todo') { U.tab = 'todo'; requestRender(); return true; }
  return false;
}
