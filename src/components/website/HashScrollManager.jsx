import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"];

const decodeHash = (hash) => {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
};

// Scrolls to the current section hash on the public homepage. Covers:
// - navigating here from another page (About/Contact header, footer, CTAs),
// - first load / reload with a section in the URL (e.g. /#faq),
// - browser Back/Forward to a section URL.
// Content above a section (live prices, published copy, contact photos) can
// finish loading AFTER the first scroll and push the section down, so the
// section is kept aligned while the page settles — until the visitor scrolls
// themselves or a few seconds pass. scroll-mt-20 keeps it clear of the header.
export default function HashScrollManager() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    const id = decodeHash(hash);
    let stopped = false;
    let timer;
    let observer;

    const align = () => {
      if (!stopped) document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
    };
    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      observer?.disconnect();
      USER_SCROLL_EVENTS.forEach((ev) => window.removeEventListener(ev, stop));
    };

    let attempts = 0;
    const attempt = () => {
      if (stopped) return;
      if (!document.getElementById(id)) {
        attempts += 1;
        if (attempts < 30) timer = window.setTimeout(attempt, 100);
        return;
      }
      align();
      observer = new ResizeObserver(align);
      observer.observe(document.body);
      timer = window.setTimeout(stop, 4000);
    };

    USER_SCROLL_EVENTS.forEach((ev) => window.addEventListener(ev, stop, { passive: true }));
    attempt();
    return stop;
  }, [hash]);

  useEffect(() => {
    const onHashChange = () => {
      const id = decodeHash(window.location.hash);
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}