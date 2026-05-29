export function isFirebaseHostingClient(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.endsWith(".web.app") ||
    host.endsWith(".firebaseapp.com") ||
    (process.env.NODE_ENV === "production" && !host.includes("localhost"))
  );
}

export function hostingHref(href: string): string {
  if (!isFirebaseHostingClient()) return href;

  const hashIdx = href.indexOf("#");
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const qIdx = withoutHash.indexOf("?");
  const pathname = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
  const search = qIdx >= 0 ? withoutHash.slice(qIdx) : "";

  if (/\.[a-z0-9]{2,8}$/i.test(pathname)) {
    return pathname + search + hash;
  }

  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.replace(/\/+$/, "") : pathname;

  return normalized + search + hash;
}

export function hardNavigateHosting(href: string): void {
  const url = hostingHref(href);
  window.location.href = new URL(url, window.location.origin).href;
}
