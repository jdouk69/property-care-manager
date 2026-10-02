import React from "react";

// LocalBusiness structured data for the public homepage.
// The platform already emits WebSite + Organization schema ("Property Care
// Crete", same URL and logo), so only the LocalBusiness entity is added here —
// no duplicate WebSite node. Details are the verified contact details already
// published on the site's contact section. No address, opening hours, ratings
// or credentials are claimed — none are configured for this business.
const SITE_URL = "https://propertycarecrete.com";

const DATA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": SITE_URL + "/#business",
  name: "Property Care Crete",
  url: SITE_URL + "/",
  telephone: "+306941544475",
  email: "demetriosntouk@gmail.com",
  logo: "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/808b3ab1a_logo.png",
  image:
    "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/808b3ab1a_logo.png/v1/fill/w_1200,h_630/808b3ab1a_logo.png",
  areaServed: ["Chania", "Western Crete"],
  description:
    "Property care and home watch in Chania, Crete. Scheduled visits, arrival preparation and local support for owners who are away. Photos and reports included with selected plans.",
};

export default function LocalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(DATA) }}
    />
  );
}