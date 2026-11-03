import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const SCROLL_STORAGE_KEY = "pcc-scroll-positions-v1";

function readScrollPositions() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveScrollPosition(key, position) {
  if (!key) return;
  try {
    const positions = readScrollPositions();
    positions[key] = position;
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
  } catch {}
}

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { pathname, search, hash, key, state } = location;

  useEffect(() => {
    let saveTimer = 0;
    const rememberPosition = () => {
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        saveScrollPosition(key, { x: window.scrollX, y: window.scrollY });
      }, 150);
    };
    window.addEventListener("scroll", rememberPosition, { passive: true });
    saveScrollPosition(key, { x: window.scrollX, y: window.scrollY });

    return () => {
      window.removeEventListener("scroll", rememberPosition);
      if (saveTimer) window.clearTimeout(saveTimer);
      saveScrollPosition(key, { x: window.scrollX, y: window.scrollY });
    };
  }, [key]);

  useEffect(() => {
    let frame = 0;
    let timer = 0;

    if (hash) {
      const id = getHashId(hash);
      timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    const tabRestore = state?.mobileTabRestore;
    const savedPosition = readScrollPositions()[key];
    if (tabRestore && Number.isFinite(Number(tabRestore.scrollY))) {
      frame = window.requestAnimationFrame(() => window.scrollTo({ top: Math.max(0, Number(tabRestore.scrollY)), left: 0, behavior: "instant" }));
    } else if (navigationType === "POP") {
      // Keep the browser's native back/forward restoration when available;
      // use our saved entry position as a fallback for mobile webviews.
      if (savedPosition && Number.isFinite(Number(savedPosition.y))) {
        frame = window.requestAnimationFrame(() => window.scrollTo({ top: Math.max(0, Number(savedPosition.y)), left: 0, behavior: "instant" }));
      }
    } else if (pathname || search) {
      frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname, search, hash, key, navigationType, state]);

  return null;
}