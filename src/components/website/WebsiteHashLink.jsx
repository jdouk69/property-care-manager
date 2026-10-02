import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_PATHS = ["/", "/landing-page"];

// A section link (e.g. "#services") for the public website. If the section is
// on the current page it scrolls there directly — even when the same link is
// tapped twice — and keeps the section hash in the URL (shareable). From any
// other page (About, Contact) it navigates to the homepage section, which
// HashScrollManager scrolls after the homepage finishes rendering. Used by the
// public header and footer so both behave identically, in every language.
export default function WebsiteHashLink({ href, className, children, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = href.startsWith("#") ? href : `#${href}`;
  let id;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    id = hash.slice(1);
  }
  const onHome = HOME_PATHS.includes(location.pathname);

  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (onHome && target) {
      // URL keeps the section hash without a router round-trip, so the
      // scroll happens instantly and stays reliable on mobile and desktop.
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${hash}`);
      target.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/${hash}`);
    }
    if (onNavigate) onNavigate();
  };

  return (
    <a href={onHome ? hash : `/${hash}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}