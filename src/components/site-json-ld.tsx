/** Absolute production URLs for Google logo / Organization. */
const BASE = "https://www.tempempire.store";

/** Schema-only (JSON-LD). Never render this name in visible page copy. */
const FOUNDER = {
  "@type": "Person" as const,
  name: "Shabeh Ul Hassan",
};

/** Crawlable Organization + WebSite JSON-LD with absolute logo URL for Google. */
export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Temp Empire",
    url: BASE,
    founder: FOUNDER,
    owner: FOUNDER,
    logo: {
      "@type": "ImageObject",
      url: `${BASE}/icon-192.png`,
      contentUrl: `${BASE}/icon-192.png`,
      width: 192,
      height: 192,
    },
    image: `${BASE}/og-image.png`,
    description:
      "SMS OTP website for a US temp num, UK temp num, and temp num Canada. Facebook OTP verification, WhatsApp OTP, and Temp Mail Plus-style email.",
    sameAs: [] as string[],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@tempempire.store",
      url: `${BASE}/support`,
      availableLanguage: ["English"],
    },
    email: "support@tempempire.store",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Temp Empire",
    url: BASE,
    description:
      "US temp num, UK temp num, and Canada temp number on this OTP website — Facebook OTP, WhatsApp OTP, Temp Mail Plus.",
    publisher: {
      "@type": "Organization",
      name: "Temp Empire",
      url: BASE,
      founder: FOUNDER,
      owner: FOUNDER,
      logo: {
        "@type": "ImageObject",
        url: `${BASE}/icon-192.png`,
        width: 192,
        height: 192,
      },
    },
  };

  const offerCatalog = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Temporary SMS OTP numbers",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "UK temporary phone numbers (+44)",
          url: `${BASE}/buy/uk`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "USA temporary phone numbers (+1)",
          url: `${BASE}/buy/usa`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Canada temporary phone numbers",
          url: `${BASE}/buy/canada`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Facebook OTP verification numbers",
          url: `${BASE}/buy/usa/facebook`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Temp Mail Plus disposable email",
          url: `${BASE}/mail`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalog) }}
      />
    </>
  );
}
