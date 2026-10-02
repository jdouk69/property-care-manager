import React from "react";

// LocalBusiness + WebSite structured data for the public homepage.
// Details are the verified contact details already published on the site's
// contact section (owner profile). No address, opening hours, ratings or
// credentials are claimed — none are configured for this business.
const SITE_URL = "https://propertycarecrete.base44.app";

const DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": SITE_URL + "/#business",
      name: "Property Care Crete",
      url: SITE_URL,
      telephone: "+306941544475",
      email: "demetriosntouk@gmail.com",
      image:
        "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/808b3ab1a_logo.png/v1/fill/w_1200,h_630/808b3ab1a_logo.png",
      areaServed: ["Chania", "Western Crete"],
      description:
        "Property care and home watch in Chania, Crete. Scheduled visits, photos and reports, arrival preparation and local support for owners who are away.",
    },
    {
      "@type": "WebSite",
      "@id": SITE_URL + "/#website",
      name: "Property Care Crete",
      url: SITE_URL,
      publisher: { "@id": SITE_URL + "/#business" },
    },
  ],
};

export default function LocalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(DATA) }}
    />
  );
}