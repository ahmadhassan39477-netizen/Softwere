/** Absolute <title> + meta description for key public routes. Target 50–60 / 140–160. */

export type PageMeta = {
  title: string;
  description: string;
};

export const PAGE_META = {
  home: {
    title: "US & UK Temp Number | SMS OTP Website | Temp Empire",
    description:
      "Buy a US temp num or UK temp num on this SMS OTP website. Facebook OTP, WhatsApp OTP, temp num Canada, and Temp Mail Plus — private, not a free shared inbox.",
  },
  uk: {
    title: "UK Temp Num (+44) | Temp Number OTP Website | Temp Empire",
    description:
      "Get a UK temp num (+44) on this OTP website. Temp number for WhatsApp OTP, Facebook OTP verification, and SMS online — private inbox, WhatsApp deposit.",
  },
  usa: {
    title: "US Temp Num (+1) | Temp Num USA OTP Website | Temp Empire",
    description:
      "Buy a US temp num (temp num USA) on this SMS OTP website. Temporary number for Facebook OTP, WhatsApp OTP, and receive SMS online — private +1 inbox.",
  },
  canada: {
    title: "Temp Num Canada (+1) | Canada Temp Number | Temp Empire",
    description:
      "Buy a temp num Canada on this OTP website. Canada temporary number for WhatsApp OTP, Facebook OTP, and SMS online — private virtual inbox, WhatsApp deposit.",
  },
  mail: {
    title: "Temp Mail Plus | Free Disposable Email | Temp Empire",
    description:
      "Temp Mail Plus-style disposable email on Temp Empire. Create a free alias, read mail in a live inbox, and keep your real address private — sign in to generate.",
  },
  support: {
    title: "OTP Website Support | Temp Number Help | Temp Empire",
    description:
      "Help for this SMS OTP website: US temp num, UK temp num, Facebook OTP code not received, WhatsApp deposits on 03072577778, and Temp Mail Plus.",
  },
  login: {
    title: "Sign In | Temp Number SMS OTP Website | Temp Empire",
    description:
      "Sign in to this SMS OTP website to buy a US temp num, UK temp num, or temp num Canada. Facebook OTP, WhatsApp OTP, and Temp Mail Plus wait in your inbox.",
  },
  register: {
    title: "Sign Up | Temp OTP Website | Temp Num | Temp Empire",
    description:
      "Create a Temp Empire account to buy a temp number on this OTP website. US, UK, Canada, Facebook OTP, WhatsApp OTP, and Temp Mail Plus after signup.",
  },
  about: {
    title: "About Temp Empire | Honest Independent OTP Website",
    description:
      "Temp Empire is an independent shop for private temporary numbers and email. Sign up, add credit on WhatsApp 03072577778, then buy. We are not a phone carrier.",
  },
  privacy: {
    title: "Privacy Policy | Temp Empire SMS OTP Data Practices",
    description:
      "How Temp Empire uses account email, wallet, and SMS inbox data. We do not sell personal information. Email support@tempempire.store or WhatsApp 03072577778.",
  },
  terms: {
    title: "Terms of Use | Temp Empire Temporary Number Policy",
    description:
      "Sign up before buying. Deposit on WhatsApp 03072577778. Use numbers for legitimate checks only and follow each app’s terms. Refund if SMS never arrives.",
  },
} as const satisfies Record<string, PageMeta>;

export const HOME_KEYWORDS = [
  "us temp num",
  "temp number",
  "temp num free",
  "uk temp num",
  "temp num canada",
  "temp num usa",
  "facebook otp verification",
  "facebook otp code free",
  "facebook otp number",
  "facebook otp verification phone number",
  "facebook otp code not received",
  "facebook otp",
  "sms otp website",
  "otp website",
  "free virtual number otp website",
  "otp website for whatsapp",
  "temp otp website",
  "temp mail plus",
] as const;

export function absoluteTitle(title: string) {
  return { absolute: title };
}

const TITLE_MIN = 50;
const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 160;

export function metaLengthIssues(pages: Record<string, PageMeta> = PAGE_META) {
  const issues: string[] = [];
  for (const [key, { title, description }] of Object.entries(pages)) {
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      issues.push(`${key} title ${title.length} (want ${TITLE_MIN}–${TITLE_MAX}): ${title}`);
    }
    if (description.length < DESC_MIN || description.length > DESC_MAX) {
      issues.push(
        `${key} description ${description.length} (want ${DESC_MIN}–${DESC_MAX}): ${description}`,
      );
    }
  }
  return issues;
}
