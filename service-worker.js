self.addEventListener("install", (e) => {
    console.log("Service Worker instalado");
    e.waitUntil(
        caches.open("ranking-cache").then((cache) => {
            return cache.addAll([
                "./index.html",
                "./manifest.json",
                "./icons/inimigos_da_bola-192x192.jpg",
                "./icons/inimigos_da_bola-512x512.jpg",
                "./sounds/PES 2013 Select Game Main Menu Sound Effect (mp3cut.net).mp3"
            ]);
        }).catch(err => console.error("Cache addAll failed:", err))
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then((resp) => resp || fetch(e.request).catch(() => console.warn("Fetch failed:", e.request)))
    );
});
