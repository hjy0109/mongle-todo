export const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
export const SHAPES = [['jelly', '젤리'], ['circle', '동그라미'], ['heart', '하트'], ['star', '별']];
export const THEMES = [
  { id: 'lilac', name: '라일락 젤리', l: '#8B6FE8', d: '#A792F5', on: '#FFFFFF', p: ['c5', 'c3'], garden: 'space' },
  { id: 'peach', name: '피치 소다', l: '#EE7F68', d: '#F39482', on: '#FFFFFF', p: ['c1', 'c4'], garden: 'peach' },
  { id: 'mint', name: '민트 초코', l: '#36A882', d: '#5BC49E', on: '#FFFFFF', p: ['c2', 'c10'], garden: 'bunny' },
  { id: 'sky', name: '하늘 구름', l: '#4F8DE6', d: '#7FA8F0', on: '#FFFFFF', p: ['c3', 'c8'], garden: 'cloud' },
  { id: 'lemon', name: '레몬 캔디', l: '#E2AE24', d: '#E8BC4A', on: '#3A2E05', p: ['c4', 'c9'], garden: 'chick' },
  { id: 'cherry', name: '체리 블라썸', l: '#E2649A', d: '#EE8DB3', on: '#FFFFFF', p: ['c6', 'c7'], garden: 'flower' }
];
export const GARDENS = {
  space: { name: '반짝 우주', lv: ['#D3CBF3', '#9C8DE2', '#6352C0', '#2F2570'], sp: ['star', 'planet'], spBg: '#1C1640', unit: '별', msg: '습관을 다 끝낸 날엔 가끔 별이 떠요' },
  peach: { name: '복숭아 과수원', lv: ['#FFDCCF', '#FFB8A3', '#F78F74', '#DE6448'], sp: ['peach'], spBg: '#FFF1EA', unit: '복숭아', msg: '습관을 다 끝낸 날엔 가끔 복숭아가 열려요' },
  bunny: { name: '토끼 잔디밭', lv: ['#CDEFD8', '#94D8AC', '#57BD82', '#2F995D'], sp: ['bunny'], spBg: '#2F995D', unit: '토끼', msg: '습관을 다 끝낸 날엔 가끔 토끼가 놀러 와요' },
  cloud: { name: '구름 하늘', lv: ['#D5E6FB', '#A7C9F4', '#72A5EA', '#4179D3'], sp: ['cloud'], spBg: '#4179D3', unit: '구름', msg: '습관을 다 끝낸 날엔 가끔 구름이 지나가요' },
  chick: { name: '병아리 들판', lv: ['#FBEFC0', '#F6DC7A', '#EDC441', '#D2A017'], sp: ['chick'], spBg: '#8CC66A', unit: '병아리', msg: '습관을 다 끝낸 날엔 가끔 병아리가 나타나요' },
  flower: { name: '벚꽃 꽃밭', lv: ['#FBD6E4', '#F5A9C6', '#EC7AA7', '#D04D86'], sp: ['flower'], spBg: '#FFF4F8', unit: '꽃', msg: '습관을 다 끝낸 날엔 가끔 꽃이 피어요' }
};
const SP = {
  star: { p: { y: '#FFD86B' }, g: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'yy....yy'] },
  planet: { p: { p: '#F6A5C9', r: '#FFE08A' }, g: ['........', '...pp...', '..pppp..', 'rrrrrrrr', '..pppp..', '...pp...', '........', '........'] },
  peach: { p: { g: '#5DB86C', p: '#FF9E86', d: '#EE7259' }, g: ['....g...', '...gg...', '.pppppp.', 'ppppdppp', 'ppppdppp', 'pppppppp', '.pppppp.', '..pppp..'] },
  bunny: { p: { w: '#FFFFFF', p: '#FFB3C7', k: '#3A3046' }, g: ['.w..w...', '.wp.wp..', '.wp.wp..', 'wwwwwww.', 'wkwwwkw.', 'wwwpwww.', '.wwwww..', '..w.w...'] },
  cloud: { p: { w: '#FFFFFF' }, g: ['........', '...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', 'wwwwwwww', '.wwwwww.', '........'] },
  chick: { p: { y: '#FFE45C', k: '#3A3046', o: '#FF9A3C' }, g: ['..yyyy..', '.yyyyyy.', '.ykyyyy.', 'oyyyyyy.', '.yyyyyy.', '.yyyyyy.', '..yyyy..', '..o..o..'] },
  flower: { p: { p: '#FF8FB8', y: '#FFD54F', g: '#5DB86C' }, g: ['.pp..pp.', 'pppppppp', '.ppyypp.', '..pyyp..', '.ppyypp.', 'pppppppp', '.pp..pp.', '........'] }
};
const cache = {};
export function spriteInner(n) {
  if (cache[n]) return cache[n];
  const s = SP[n]; let r = '';
  s.g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${s.p[ch]}"/>`; }));
  return (cache[n] = r);
}
export const sprite = (n, style = '') => `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"${style ? ` style="${style}"` : ''}>${spriteInner(n)}</svg>`;
export const themeOf = id => THEMES.find(t => t.id === id) || THEMES[0];
export const gardenOf = settings => GARDENS[settings.garden && settings.garden !== 'auto' ? settings.garden : themeOf(settings.theme).garden] || GARDENS.space;
export const gardenIdOf = settings => (settings.garden && settings.garden !== 'auto' ? settings.garden : themeOf(settings.theme).garden);
