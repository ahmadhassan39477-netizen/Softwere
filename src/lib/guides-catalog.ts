/** Shared public guide index for internal SEO links (www only). */

export const GUIDES_HUB_PATH = "/guides";
export const GUIDES_HUB_URL = `https://www.tempempire.store${GUIDES_HUB_PATH}`;

export type PublicGuideId = "whatsapp" | "facebook" | "disposable" | "reseller-api";

export type PublicGuide = {
  id: PublicGuideId;
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  blurb: string;
};

export const PUBLIC_GUIDES: readonly PublicGuide[] = [
  {
    id: "whatsapp",
    path: "/guides/whatsapp-temporary-number",
    label: "WhatsApp guide",
    eyebrow: "Temporary number for WhatsApp",
    title: "Temporary phone number for WhatsApp OTP",
    blurb:
      "Five steps, US and India sections, and FAQ: how to get a temp number US, a temporary number India, and a virtual number for WhatsApp without a shared inbox.",
  },
  {
    id: "facebook",
    path: "/guides/facebook-temporary-number",
    label: "Facebook guide",
    eyebrow: "Temp number for Facebook",
    title: "Receive Facebook SMS verification online",
    blurb:
      "US (+1) and UK (+44) Facebook OTP, best temp number UK for OTP, and Pakistan plus VPN — a private inbox, not a shared wall.",
  },
  {
    id: "disposable",
    path: "/guides/disposable-phone-number",
    label: "Disposable guide",
    eyebrow: "Disposable phone number",
    title: "What is a disposable phone number?",
    blurb:
      "Temporary phone number plus temp mail for OTP. Dating apps, SIM-swapping on non-bank forms, and a private inbox — not a shared wall.",
  },
  {
    id: "reseller-api",
    path: "/guides/reseller-api",
    label: "Reseller API guide",
    eyebrow: "SMS OTP API",
    title: "Automate SMS verification with the Reseller API",
    blurb:
      "Catalog, purchase, SSE or poll for OTP, 20-minute auto-refund. Guests can read; API docs / generate keys still go through sign up.",
  },
] as const;

export function findPublicGuide(id: PublicGuideId) {
  return PUBLIC_GUIDES.find((g) => g.id === id)!;
}

export function otherPublicGuides(id: PublicGuideId) {
  return PUBLIC_GUIDES.filter((g) => g.id !== id);
}

export function guideBreadcrumbJsonLd(guide: PublicGuide) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.tempempire.store/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: GUIDES_HUB_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.label,
        item: `https://www.tempempire.store${guide.path}`,
      },
    ],
  };
}

export function guidesHubJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Temp Empire guides",
    url: GUIDES_HUB_URL,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: PUBLIC_GUIDES.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.title,
        url: `https://www.tempempire.store${g.path}`,
      })),
    },
  };
}

export function guidesHubBreadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.tempempire.store/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: GUIDES_HUB_URL,
      },
    ],
  };
}
