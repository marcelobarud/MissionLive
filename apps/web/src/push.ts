import { api } from './api';

export type DevicePushState = { supported: boolean; permission: NotificationPermission | 'unsupported'; subscribed: boolean; serverEnabled: boolean };

function supported() { return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window; }

function fromBase64Url(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function registration() { const current = await navigator.serviceWorker.getRegistration('/'); return current ?? navigator.serviceWorker.register('/sw.js'); }

export async function getDevicePushState(): Promise<DevicePushState> {
  if (!supported()) return { supported: false, permission: 'unsupported', subscribed: false, serverEnabled: false };
  const configuration = await api.pushPublicKey().catch(() => ({ publicKey: null, enabled: false }));
  const currentRegistration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await currentRegistration?.pushManager.getSubscription();
  return { supported: true, permission: Notification.permission, subscribed: Boolean(subscription), serverEnabled: configuration.enabled && Boolean(configuration.publicKey) };
}

export async function enableDevicePush() {
  if (!supported()) throw new Error('Este navegador não oferece notificações push.');
  const configuration = await api.pushPublicKey();
  if (!configuration.enabled || !configuration.publicKey) throw new Error('As notificações ainda não estão configuradas neste ambiente.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return getDevicePushState();
  const currentRegistration = await registration();
  const currentSubscription = await currentRegistration.pushManager.getSubscription();
  const subscription = currentSubscription ?? await currentRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(configuration.publicKey) });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('O navegador não retornou uma subscription válida.');
  await api.subscribePush({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
  return { supported: true, permission, subscribed: true, serverEnabled: true } satisfies DevicePushState;
}

export async function disableDevicePush() {
  if (!supported()) return getDevicePushState();
  const currentRegistration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await currentRegistration?.pushManager.getSubscription();
  if (subscription?.endpoint) await api.unsubscribePush(subscription.endpoint);
  await subscription?.unsubscribe();
  return getDevicePushState();
}
