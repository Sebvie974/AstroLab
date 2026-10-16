// AstroLab : service worker (fonctionnement hors connexion)
// Change le numéro de version ci-dessous quand tu modifies les icônes ou le manifeste.
const VERSION = "astrolab-v1";
const COQUILLE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Page principale : réseau d'abord (pour recevoir les mises à jour), cache en secours hors connexion.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(VERSION).then((c) => c.put("./index.html", copie));
          return rep;
        })
        .catch(() => caches.match("./index.html").then((x) => x || caches.match("./")))
    );
    return;
  }

  // Autres fichiers (icônes, manifeste) : cache d'abord.
  e.respondWith(
    caches.match(req).then((x) =>
      x || fetch(req).then((rep) => {
        const copie = rep.clone();
        caches.open(VERSION).then((c) => c.put(req, copie));
        return rep;
      })
    )
  );
});
