import { useEffect } from "react";

// Sets unique per-page metadata in the rendered DOM. The Base44 platform
// generates the initial <head> server-side from dashboard settings and takes
// priority there; this keeps the browser-rendered head (what Google's live
// test and link previews ultimately read) consistent with each page's content.
export default function usePageMeta({ title, description }) {
  useEffect(() => {
    if (!title) return;
    document.title = title;

    const setMeta = (attr, key, content) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:site_name", "Property Care Crete");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
  }, [title, description]);
}