import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Scrolls to the current section hash on the public homepage. Covers:
// - navigating here from another page (About/Contact header, footer, CTAs),
// - first load / reload with a section in the URL (e.g. /#services),
// - native hash changes the router may not see (back/forward, manual edits).
// Retries briefly so a section that finishes rendering late still scrolls;
// scroll-mt-20 on each section keeps the sticky header from covering it.
export default function HashScrollManager() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      id = hash.slice(1);
    }
    let cancelled = false;
    let attempts = 0;
    const attempt = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
      attempts += 1;
      if (attempts < 15) window.setTimeout(attempt, 100);
    };
    attempt();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  useEffect(() => {
    const onHashChange = () => {
      let id = "";
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        id = window.location.hash.slice(1);
      }
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}