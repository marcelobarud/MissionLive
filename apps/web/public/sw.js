const fallbackPath = '/';

function internalPath(value) {
  try {
    const url = new URL(value || fallbackPath, self.location.origin);
    if (url.origin !== self.location.origin || !/^\/goals\/[A-Za-z0-9-]+$/.test(url.pathname)) return fallbackPath;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallbackPath;
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = {}; }
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.slice(0, 120) : 'MissionLive';
  const body = typeof data.body === 'string' ? data.body.slice(0, 240) : 'Você tem uma atualização no MissionLive.';
  event.waitUntil(self.registration.showNotification(title, { body, tag: typeof data.tag === 'string' ? data.tag.slice(0, 120) : 'missionlive-reminder', data: { path: internalPath(data.url) } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = internalPath(event.notification.data?.path);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const current = windows.find((client) => client.url.startsWith(self.location.origin));
    if (current) {
      await current.focus();
      if ('navigate' in current) await current.navigate(path);
    } else await self.clients.openWindow(path);
  })());
});
