/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { disableDevicePush, enableDevicePush, getDevicePushState } from './push';

function installPushMocks(permission: NotificationPermission = 'default') {
  const requestPermission = vi.fn(async () => permission);
  class MockNotification { static permission = permission; static requestPermission = requestPermission; }
  const unsubscribe = vi.fn(async () => true);
  const subscription = { endpoint: 'https://push.example/subscription', toJSON: () => ({ endpoint: 'https://push.example/subscription', keys: { p256dh: 'public-key', auth: 'auth-key' } }), unsubscribe };
  const pushManager = { getSubscription: vi.fn(async (): Promise<typeof subscription | null> => null), subscribe: vi.fn(async () => subscription) };
  const serviceWorker = { getRegistration: vi.fn(async () => ({ pushManager })), register: vi.fn(async () => ({ pushManager })) };
  Object.defineProperty(window, 'Notification', { configurable: true, value: MockNotification });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class PushManager {} });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
  return { requestPermission, subscription, pushManager, serviceWorker };
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'Notification');
  Reflect.deleteProperty(window, 'PushManager');
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('Web Push do MissionLive', () => {
  it('não solicita permissão ao apenas consultar o estado do dispositivo', async () => {
    const mocks = installPushMocks();
    vi.spyOn(api, 'pushPublicKey').mockResolvedValue({ publicKey: 'public-vapid-key', enabled: true });

    const state = await getDevicePushState();

    expect(state).toEqual({ supported: true, permission: 'default', subscribed: false, serverEnabled: true });
    expect(mocks.requestPermission).not.toHaveBeenCalled();
  });

  it('solicita permissão somente após a ação explícita e registra a subscription', async () => {
    const mocks = installPushMocks('granted');
    vi.spyOn(api, 'pushPublicKey').mockResolvedValue({ publicKey: 'public-vapid-key', enabled: true });
    const subscribe = vi.spyOn(api, 'subscribePush').mockResolvedValue({ id: 'subscription-1' });

    const state = await enableDevicePush();

    expect(mocks.requestPermission).toHaveBeenCalledOnce();
    expect(mocks.pushManager.subscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledWith({ endpoint: 'https://push.example/subscription', p256dh: 'public-key', auth: 'auth-key' });
    expect(state.subscribed).toBe(true);
  });

  it('não solicita novamente quando a permissão está negada', async () => {
    const mocks = installPushMocks('denied');
    vi.spyOn(api, 'pushPublicKey').mockResolvedValue({ publicKey: 'public-vapid-key', enabled: true });

    const state = await enableDevicePush();

    expect(mocks.requestPermission).toHaveBeenCalledOnce();
    expect(state.permission).toBe('denied');
    expect(mocks.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('não quebra em navegador sem suporte às APIs de Push', async () => {
    const state = await getDevicePushState();

    expect(state).toEqual({ supported: false, permission: 'unsupported', subscribed: false, serverEnabled: false });
    await expect(enableDevicePush()).rejects.toThrow('não oferece notificações push');
  });

  it('remove a subscription do dispositivo pelo endpoint autenticado', async () => {
    const mocks = installPushMocks('granted');
    mocks.pushManager.getSubscription.mockResolvedValue(mocks.subscription);
    vi.spyOn(api, 'pushPublicKey').mockResolvedValue({ publicKey: 'public-vapid-key', enabled: true });
    const unsubscribe = vi.spyOn(api, 'unsubscribePush').mockResolvedValue({ removed: true });

    await disableDevicePush();

    expect(unsubscribe).toHaveBeenCalledWith('https://push.example/subscription');
    expect(mocks.subscription.unsubscribe).toHaveBeenCalledOnce();
  });
});
