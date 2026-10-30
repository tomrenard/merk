// Offline: pages you opened, the app's code and the recorded voices stay on the phone.
// Pages: network first, the last copy when offline. Code and recordings: never change, so the
// saved copy first. Answers made offline wait in the outbox (src/app/outbox.ts), not here.
// ponytail: caches only grow (old code after deploys); add cleanup by age if storage complains.

const PAGES = "merk-pages-v1";
const FILES = "merk-files-v1";
const AUDIO = "https://tomrenard.github.io/merk-audio/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// The page that installed this worker loaded its code before: it sends those URLs to keep, and
// the main pages to keep fresh for an offline start.
/** When this phone last signed out: a page that started loading before is not kept. */
let forgotAt = 0;
function forget() {
  forgotAt = Date.now();
  return caches.delete(PAGES);
}

self.addEventListener("message", (event) => {
  if (event.data?.forget) return event.waitUntil(forget());
  const keep = Array.isArray(event.data?.keep) ? event.data.keep : [];
  const pages = Array.isArray(event.data?.pages) ? event.data.pages : [];
  event.waitUntil(
    Promise.all([
      keepFiles(keep),
      // With the code each page needs: never loaded yet, so not kept by saved().
      ...pages.map(async (path) => {
        const response = await fetchPage(new Request(path)).catch(() => null);
        if (!response?.ok) return;
        const html = await response.text();
        await keepFiles([...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) ?? [])]);
      }),
    ]),
  );
});

async function keepFiles(urls) {
  const cache = await caches.open(FILES);
  await Promise.all(
    urls.map(async (url) => {
      if (await cache.match(url)) return;
      const response = await fetch(url).catch(() => null);
      if (response?.ok) await cache.put(url, response);
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.href.startsWith(AUDIO)) return event.respondWith(audio(request));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(saved(request));
  if (url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") return event.respondWith(page(request));
  // Next's in-app navigations: offline, a failed one makes Next load the page itself (page()).
  event.respondWith(fetch(request).catch(() => new Response(null, { status: 503 })));
});

/** Loads a page and keeps it, unless it is (or redirects to) the login page. */
async function fetchPage(request) {
  const started = Date.now();
  const response = await fetch(request);
  // Signed out: forget everyone's pages. Never keep a login page under another page's URL.
  if (response.type === "opaqueredirect" || response.redirected) {
    if (new URL(response.url || request.url).pathname === "/login") await forget();
  } else if (response.ok && started > forgotAt) {
    const copy = response.clone();
    caches.open(PAGES).then((cache) => cache.put(request, copy));
  }
  return response;
}

/** The network, or the kept copy when offline or when a weak connection takes over 4 s. */
async function page(request) {
  const network = fetchPage(request);
  network.catch(() => {}); // when the kept copy answered first
  const copy = await caches.match(request, { cacheName: PAGES, ignoreVary: true });
  const slow = new Promise((resolve) => setTimeout(() => resolve(copy), copy ? 4000 : 60_000));
  try {
    return (await Promise.race([network, slow])) ?? (await network);
  } catch {
    return (
      copy ??
      new Response(
        '<!doctype html><meta name="viewport" content="width=device-width"><body style="font:600 18px system-ui;text-align:center;padding:30vh 24px">Offline: this page was never opened here. <a href="/">Today</a> · <a href="/review">Review</a>',
        { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
      )
    );
  }
}

async function saved(request) {
  const copy = await caches.match(request, { cacheName: FILES });
  if (copy) return copy;
  const response = await fetch(request);
  if (response.ok) {
    const keep = response.clone();
    caches.open(FILES).then((cache) => cache.put(request, keep));
  }
  return response;
}

/**
 * Recordings, kept by URL. iOS plays audio in parts (Range requests) and only accepts a 206
 * answer, so a kept file is sliced to the part asked for.
 */
async function audio(request) {
  const key = request.url;
  let copy = await caches.match(key, { cacheName: FILES });
  if (!copy) {
    const response = await fetch(key, { mode: "cors" }).catch(() => null);
    // No file (404) or offline: the page falls back to the phone's voice.
    if (!response?.ok) return response ?? Response.error();
    copy = response.clone();
    await caches.open(FILES).then((cache) => cache.put(key, response));
  }
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "");
  if (!range) return copy;
  const body = await copy.arrayBuffer();
  const start = range[1] ? Number(range[1]) : Math.max(body.byteLength - Number(range[2]), 0);
  const end =
    range[1] && range[2] ? Math.min(Number(range[2]), body.byteLength - 1) : body.byteLength - 1;
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      "content-type": copy.headers.get("content-type") ?? "audio/mp4",
      "content-range": `bytes ${start}-${end}/${body.byteLength}`,
      "content-length": String(end - start + 1),
      "accept-ranges": "bytes",
    },
  });
}
