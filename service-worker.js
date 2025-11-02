const CACHE_NAME = 'lacos-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/cadastro.html',
  '/home_cliente.html',
  '/perfil_cuidador.html',
  '/agendamento.html',
  '/pagamento.html',
  '/feedback.html',
  '/dashboard_cuidador.html',
  '/agenda_completa.html',
  '/perfil_profissional.html',
  '/historico_pagamentos.html',
  '/perfil_cliente.html',
  // Seus ícones
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});