import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    // Initial load / reload: keep the browser's own scroll restoration
    // (deep links and F5 position restore stay intact).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    // Every later navigation — a new page, a query-only change on the same
    // path (e.g. /visits?continue=1, /visits?start=1) or a back navigation —
    // starts at the top. The SPA performs no per-entry scroll restoration, so
    // without this the window keeps the outgoing screen's scroll offset and
    // the destination page opens partway down or near the bottom. This fires
    // once per navigation only; scrolling while the user works on a page is
    // untouched (no page rewrites query params during interaction).
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, hash]);

  return null;
}