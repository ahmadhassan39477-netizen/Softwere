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
    sameAs: [] as string[],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Temp Empire",
    url: BASE,
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
    </>
  );
}
