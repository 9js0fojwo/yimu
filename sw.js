const CACHE_NAME = 'yimu-v2';
const ASSETS = ['./index.html', './manifest.json'];

// 安装：预缓存核心文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：HTML 用缓存优先+后台更新，其他资源直接走网络
self.addEventListener('fetch', e => {
  // 非 GET 请求直接走网络
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  // HTML 页面：先给缓存秒开，同时后台更新缓存
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetchPromise = fetch(e.request).then(function(response) {
            if (response && response.status === 200) {
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(function() {
            // 网络失败，返回缓存（如果有的话）
            return cached;
          });
          // 如果有缓存就直接返回（秒开），否则等网络
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // 其他静态资源：缓存回退
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).catch(function() { return cached; });
    })
  );
});

// 通知点击
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});
