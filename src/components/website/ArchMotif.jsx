import React from "react";

// Stone & Brass signature decorative motifs — thin arched lines in brass.
// Purely visual; no text content.

// Double arch — used on the dark hero (bottom edge) and the dark CTA footer.
export default function ArchMotif({ className = "" }) {
  return (
    <svg viewBox="0 0 200 100" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 100 V42 C12 22 28 8 48 8 H152 C172 8 188 22 188 42 V100"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M32 100 V48 C32 34 44 24 58 24 H142 C156 24 168 34 168 48 V100"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// Corner brackets — small curved accents for the top corners of pricing cards.
export function CardArches({ className = "" }) {
  return (
    <svg viewBox="0 0 60 20" fill="none" aria-hidden="true" className={className}>
      <path d="M2 20 V8 C2 3.6 5.6 0 10 0" stroke="currentColor" strokeWidth="1.5" />
      <path d="M58 20 V8 C58 3.6 54.4 0 50 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}