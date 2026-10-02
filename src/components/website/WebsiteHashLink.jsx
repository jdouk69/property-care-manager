import React, { forwardRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const HOME_PATHS = ["/", "/landing-page"];

// A section link (e.g. "#services") for the public website. If the section is
// on the current page it scrolls there directly — even when the same link is
// tapped twice — and keeps the section hash in the URL (shareable). From any
// other page (About, Contact) it navigates to the public homepage section,
// which HashScrollManager scrolls after the homepage finishes rendering.
// Signed-in staff see the Dashboard at "/", so their public homepage is
// /landing-page; visitors always use "/".
const WebsiteHashLink = forwardRef(function WebsiteHashLink(
  { href, className, children, onNavigate, ...rest },
  ref
) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const homePath = isAuthenticated ? "/landing-page" : "/";
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
      navigate(`${homePath}${hash}`);
    }
    if (onNavigate) onNavigate();
  };

  return (
    <a {...rest} ref={ref} href={onHome ? hash : `${homePath}${hash}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
});

export default WebsiteHashLink;