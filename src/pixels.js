// 16x16 avatars and 12x12 reaction stickers drawn as pixel grids.
const AP = {"o":"#3A3046","k":"#3A3046","w":"#FFFFFF","p":"#FFB3C7","c":"#FFC2D3","n":"#FF8FB1","g":"#8FD18A","m":"#4E9A55","s":"#D2AE74","S":"#8C6A3F","b":"#45507A","y":"#FFC24D","f":"#E9BC8B","E":"#A8774F","t":"#FF8FA3","N":"#3A3046"};
export const AVATARS = {
 "rabbit": {
  "name": "토끼",
  "bg": "#FFE3EC",
  "g": [
   "....oo....oo....",
   "...owwo..owwo...",
   "...owpo..opwo...",
   "...owpo..opwo...",
   "...owpo..opwo...",
   "..oowwoooowwoo..",
   ".owwwwwwwwwwwwo.",
   "owwwwwwwwwwwwwwo",
   "owwkwwwwwwwwkwwo",
   "owcwwwwwwwwwwcwo",
   "owwwwwwnnwwwwwwo",
   "owwwwwwwwwwwwwwo",
   ".owwwwwwwwwwwwo.",
   "..oowwwwwwwwoo..",
   "....oooooooo....",
   "................"
  ]
 },
 "turtle": {
  "name": "거북이",
  "bg": "#E3F5DC",
  "g": [
   "................",
   ".....oooooo.....",
   "....oggggggo....",
   "...oggggggggo...",
   "...ogkggggkgo...",
   "...ocggggggco...",
   "...ogggmmgggo...",
   "....oggggggo....",
   "..oooooooooooo..",
   ".osssSssssSssso.",
   "osssSSssssSSssso",
   "ossssSSSSSSsssso",
   "osssSssssssSssso",
   ".ogoooooooooogo.",
   "..oo........oo..",
   "................"
  ]
 },
 "penguin": {
  "name": "펭귄",
  "bg": "#DDE6FA",
  "g": [
   "................",
   ".....oooooo.....",
   "....obbbbbbo....",
   "...obbbbbbbbo...",
   "..obbwwbbwwbbo..",
   "..obwwkwwkwwbo..",
   "..obwcwwwwcwbo..",
   "..obwwwyywwwbo..",
   ".obbbwwwwwwbbbo.",
   ".obbwwwwwwwwbbo.",
   "obbbwwwwwwwwbbbo",
   "obbbwwwwwwwwbbbo",
   ".obbwwwwwwwwbbo.",
   "..obbwwwwwwbbo..",
   "...oyyooooyyo...",
   "................"
  ]
 },
 "dog": {
  "name": "강아지",
  "bg": "#FBEBD9",
  "g": [
   "................",
   "................",
   "....oooooooo....",
   "..ooffffffffoo..",
   ".oEEffffffffEEo.",
   "oEEEffffffffEEEo",
   "oEEEfkffffkfEEEo",
   "oEEEcffffffcEEEo",
   "oEEffffNNffffEEo",
   ".oEfffwwwwfffEo.",
   "..offfwttwfffo..",
   "...offffffffo...",
   "....oooooooo....",
   "................",
   "................",
   "................"
  ]
 }
};
const SP = {"o":"#3A3046","k":"#3A3046","p":"#FF7FA8","w":"#FFFFFF","s":"#FFD7AE","S":"#E7A975","b":"#7EA9F0","y":"#FFD54F","r":"#FF7A45","g":"#6CC07A","c":"#FFA8C0","t":"#7EC8F2","R":"#FF8C7A"};
export const STICKERS = {
 "heart": {
  "name": "좋아",
  "g": [
   "............",
   "..oo....oo..",
   ".owpo..oppo.",
   "owpppooppppo",
   "oppppppppppo",
   "oppppppppppo",
   ".oppppppppo.",
   "..oppppppo..",
   "...oppppo...",
   "....oppo....",
   ".....oo.....",
   "............"
  ]
 },
 "thumb": {
  "name": "최고",
  "g": [
   "....oo......",
   "...oso......",
   "...oso......",
   "..ossooooo..",
   "bbossssssso.",
   "bbosssSSSso.",
   "bbossssssso.",
   "bbosssSSSso.",
   "bbossssssso.",
   "bbooooooooo.",
   "............",
   "............"
  ]
 },
 "fire": {
  "name": "불타올라",
  "g": [
   ".....o......",
   "....oro.....",
   "....orro..o.",
   "...orrro.oro",
   "..orrrrrorro",
   ".orrryrrrrro",
   ".orryyyrrro.",
   "orryyyyyrrro",
   "orryywyyyrro",
   ".orryyyyrro.",
   "..orrrrrro..",
   "...oooooo..."
  ]
 },
 "lol": {
  "name": "ㅋㅋㅋ",
  "g": [
   "...oooooo...",
   ".ooyyyyyyoo.",
   ".oyyyyyyyyo.",
   "oyykyyyykyyo",
   "oykykyykykyo",
   "oyyyyyyyyyyo",
   "occyyyyyycco",
   "oyyykkkkyyyo",
   ".oyykrrkyyo.",
   ".ooyykkyyoo.",
   "...oooooo...",
   "............"
  ]
 },
 "cry": {
  "name": "엉엉",
  "g": [
   "...oooooo...",
   ".ooyyyyyyoo.",
   ".oyyyyyyyyo.",
   "oyyyyyyyyyyo",
   "oykkyyyykkyo",
   "oyttyyyyttyo",
   "oyttykkyttyo",
   "oyttkyykttyo",
   ".otyyyyyyto.",
   ".ooyyyyyyoo.",
   "...oooooo...",
   "............"
  ]
 },
 "angry": {
  "name": "화났어",
  "g": [
   "...oooooo...",
   ".ooRRRRRRoo.",
   ".oRkRRRRkRo.",
   "oRRRkRRkRRRo",
   "oRRkkRRkkRRo",
   "oRRRRRRRRRRo",
   "oRRRkkkkRRRo",
   "oRRkRRRRkRRo",
   ".oRRRRRRRRo.",
   ".ooRRRRRRoo.",
   "...oooooo...",
   "............"
  ]
 }
}
;
const cache = {};
function draw(grid, pal, n) {
  let r = '';
  grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') r += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + pal[ch] + '"/>'; }));
  return '<svg viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>';
}
export function avatarSvg(k) { const a = AVATARS[k] || AVATARS.rabbit; return (cache['a' + k] ||= draw(a.g, AP, 16)); }
export function stickerSvg(k) { const s = STICKERS[k] || STICKERS.heart; return (cache['s' + k] ||= draw(s.g, SP, 12)); }
export const avatarHTML = (k, size, label = '') => '<span class="av" style="width:' + size + 'px;height:' + size + 'px;background:' + (AVATARS[k] || AVATARS.rabbit).bg + '"' + (label ? ' title="' + label + '"' : '') + '>' + avatarSvg(k) + '</span>';
export const stickerHTML = (k, size) => '<span class="stk" style="width:' + size + 'px;height:' + size + 'px" title="' + ((STICKERS[k] || {}).name || '') + '">' + stickerSvg(k) + '</span>';
