/** Absolute production URLs for Google logo / Organization. */
const BASE = "https://www.tempempire.store";

/** Crawlable Organization + WebSite JSON-LD with absolute logo URL for Google. */
export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Temp Empire",
    url: BASE,
    logo: `${BASE}/icon-192.png`,
    image: `${BASE}/og-image.png`,
    description:
      "Buy UK and USA temporary phone numbers to receive SMS OTP online. Private virtual numbers for WhatsApp, Telegram, Google and more.",
    sameAs: [] as string[],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE}/support`,
      availableLanguage: ["English"],
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Temp Empire",
    url: BASE,
    description:
      "Temporary UK (+44) and USA (+1) phone numbers for SMS verification and OTP.",
    publisher: {
      "@type": "Organization",
      name: "Temp Empire",
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
