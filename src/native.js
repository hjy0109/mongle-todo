import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { hash32 } from './util.js';

export const isNative = Capacitor.isNativePlatform();
const WidgetBridge = registerPlugin('WidgetBridge');
let LN, Prefs, AppP;
async function load() {
  if (!isNative || LN) return;
  [{ LocalNotifications: LN }, { Preferences: Prefs }, { App: AppP }] = await Promise.all([
    import('@capacitor/local-notifications'), import('@capacitor/preferences'), import('@capacitor/app')
  ]);
}

/* ---------- notifications ---------- */
export async function notifPermission() {
  if (isNative) { await load(); return (await LN.checkPermissions()).display; }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}
export async function requestNotifPermission() {
  if (isNative) { await load(); return (await LN.requestPermissions()).display; }
  if (!('Notification' in window)) return 'unsupported';
  return await Notification.requestPermission();
}

let webTimers = [];
let lastSig = '';
export async function scheduleAlarms(alarms, silent, onWebFire) {
  const list = alarms.slice(0, 60);
  const sig = JSON.stringify([silent, list.map(a => [a.key, +a.at, a.title, a.body])]);
  if (sig === lastSig) return;
  lastSig = sig;
  if (isNative) {
    await load();
    try {
      if ((await LN.checkPermissions()).display !== 'granted') return;
      const pend = await LN.getPending();
      if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
      if (!list.length) return;
      await LN.schedule({
        notifications: list.map(a => ({
          id: hash32(a.key), title: a.title, body: a.body,
          schedule: { at: a.at, allowWhileIdle: true },
          channelId: silent ? 'popup_quiet' : 'popup_sound', smallIcon: 'ic_stat_mongle', iconColor: '#8B6FE8'
        }))
      });
    } catch (e) { console.warn('schedule failed', e); }
    return;
  }
  // Web: alarms only fire while the page is open.
  webTimers.forEach(clearTimeout);
  webTimers = list.filter(a => a.at - Date.now() < 864e5).map(a => setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(a.title, { body: a.body, silent, tag: a.key }); } catch { /* some browsers need a service worker */ }
    }
    onWebFire && onWebFire(a);
  }, Math.max(0, a.at - Date.now())));
}
export async function testNotification(silent) {
  const title = '몽글 투두 알림 테스트', body = '알림이 이렇게 떠요';
  if (isNative) {
    await load();
    await LN.schedule({ notifications: [{ id: 7777, title, body, schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true }, channelId: silent ? 'popup_quiet' : 'popup_sound', smallIcon: 'ic_stat_mongle' }] });
    return true;
  }
  if ('Notification' in window && Notification.permission === 'granted') { new Notification(title, { body, silent }); return true; }
  return false;
}

/* ---------- widget ---------- */
let lastWidget = '';
export async function pushWidget(data) {
  if (!isNative) return;
  const v = JSON.stringify(data);
  if (v === lastWidget) return;
  lastWidget = v;
  await load();
  await Prefs.set({ key: 'widget_data', value: v });
  try { await WidgetBridge.refresh(); } catch { /* widget not placed */ }
}
export async function takeWidgetPending() {
  if (!isNative) return [];
  await load();
  const { value } = await Prefs.get({ key: 'widget_pending' });
  if (!value) return [];
  await Prefs.remove({ key: 'widget_pending' });
  try { return JSON.parse(value); } catch { return []; }
}
export async function onResume(cb) {
  if (isNative) { await load(); AppP.addListener('appStateChange', s => { if (s.isActive) cb(); }); }
  else document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); });
}
export async function onBack(cb) {
  if (!isNative) return;
  await load();
  AppP.addListener('backButton', () => { if (!cb()) AppP.minimizeApp(); });
}
export async function setBars(dark) {
  if (!isNative) return;
  try { await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }); } catch { /* older runtime */ }
}

/* ---------- backup file ---------- */
export async function saveBackup(name, text) {
  if (isNative) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const r = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, files: [r.uri], dialogTitle: '백업 파일 저장할 곳 고르기' });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
