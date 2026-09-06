/* ═════════════════════════════════════════════
   People Base — Service Worker (оффлайн-режим)
   Стратегия: cache-first с фолбэком на сеть
   ═════════════════════════════════════════════ */
const CACHE_NAME = 'people-base-v1';

// Основные ресурсы приложения (кешируются при установке)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

/* ── Установка: кешируем базовые ресурсы ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

/* ── Активация: чистим старые кеши ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Запросы: кеш-сначала, fallback на сеть ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Работаем только с GET-запросами
  if (request.method !== 'GET') return;

  // Не кешируем внешние запросы (например, CDN SheetJS)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Кешируем успешные ответы для последующего оффлайн-доступа
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Если сеть недоступна — пробуем отдать index.html (SPA fallback)
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        })
    })
  );
});