// AstroLab : service worker (fonctionnement hors connexion)
// Il ne touche qu'à ses propres caches (noms commençant par "astrolab-") : les autres
// applications hébergées à la même adresse github.io ne sont pas affectées.
// Change le numéro de version quand tu modifies les icônes ou le manifeste.
const PREFIXE = "astrolab-";
const VERSION = PREFIXE + "v3";
const COQUILLE = [
  "./",
  "./index.html",
  "./manifest.json",
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
      .then((cles) => Promise.all(
        cles.filter((k) => k.startsWith(PREFIXE) && k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Page principale : réseau d'abord (pour recevoir les mises à jour), copie locale hors connexion.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const rep = await fetch(req);
        if (rep.ok && /(\/|index\.html)$/.test(url.pathname)) cache.put("./index.html", rep.clone());
        return rep;
      } catch (err) {
        return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Autres fichiers (icônes, manifeste) : copie locale tout de suite, mise à jour en arrière-plan.
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const copie = await cache.match(req);
    const reseau = fetch(req)
      .then((rep) => { if (rep.ok) cache.put(req, rep.clone()); return rep; })
      .catch(() => copie);
    return copie || reseau;
  })());
});
