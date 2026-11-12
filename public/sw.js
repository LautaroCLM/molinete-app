/*
 * Service worker de Molinete (app instalable).
 * - Páginas: siempre desde la red (son personales y cambian); sin conexión, una pantalla de aviso.
 * - Archivos estáticos con hash (/_next/static): se guardan para abrir más rápido.
 * Nunca guarda páginas, datos ni respuestas de la API.
 */
const CACHE = "molinete-v1"
const OFFLINE = "/offline.html"
const PRECARGA = [OFFLINE, "/logo-molinete.png", "/icon-192.png"]

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith("molinete-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)))
    return
  }

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const guardado = await c.match(req)
        if (guardado) return guardado
        const res = await fetch(req)
        if (res.ok) c.put(req, res.clone())
        return res
      }),
    )
  }
})
