import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1", availability: 842 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44", availability: 512 },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", availability: 1203 },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91", availability: 2100 },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49", availability: 390 },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33", availability: 280 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55", availability: 640 },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62", availability: 980 },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dialCode: "+63", availability: 710 },
  { code: "RU", name: "Russia", flag: "🇷🇺", dialCode: "+7", availability: 1500 },
];

const SERVICES = [
  { slug: "whatsapp", name: "WhatsApp", category: "Messaging", base: 0.35 },
  { slug: "telegram", name: "Telegram", category: "Messaging", base: 0.28 },
  { slug: "google", name: "Google / Gmail", category: "Accounts", base: 0.42 },
  { slug: "openai", name: "OpenAI / ChatGPT", category: "AI", base: 0.55 },
  { slug: "tinder", name: "Tinder", category: "Dating", base: 0.48 },
  { slug: "binance", name: "Binance", category: "Crypto", base: 0.62 },
  { slug: "facebook", name: "Facebook", category: "Social", base: 0.3 },
  { slug: "tiktok", name: "TikTok", category: "Social", base: 0.38 },
  { slug: "discord", name: "Discord", category: "Messaging", base: 0.25 },
  { slug: "twitter", name: "Twitter / X", category: "Social", base: 0.4 },
  { slug: "instagram", name: "Instagram", category: "Social", base: 0.36 },
  { slug: "uber", name: "Uber", category: "Transport", base: 0.45 },
];

async function main() {
  await prisma.tempMailMessage.deleteMany();
  await prisma.tempMail.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.serviceOffer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.country.deleteMany();
  await prisma.providerConfig.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@tempempire.com";
  const demoEmail = process.env.SEED_DEMO_EMAIL ?? "demo@tempempire.com";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  const demoPass = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Temp Empire Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPass, 10),
      balance: new Prisma.Decimal("100.0000"),
      apiKey: `te_admin_${nanoid(24)}`,
    },
  });

  const demo = await prisma.user.create({
    data: {
      email: demoEmail,
      name: "Demo User",
      role: "USER",
      passwordHash: await bcrypt.hash(demoPass, 10),
      balance: new Prisma.Decimal("25.0000"),
      apiKey: `te_live_${nanoid(24)}`,
    },
  });

  const countries = [];
  for (let i = 0; i < COUNTRIES.length; i++) {
    const c = COUNTRIES[i];
    countries.push(
      await prisma.country.create({
        data: { ...c, sortOrder: i, enabled: true },
      }),
    );
  }

  const services = [];
  for (const s of SERVICES) {
    services.push(
      await prisma.service.create({
        data: {
          slug: s.slug,
          name: s.name,
          category: s.category,
          enabled: true,
        },
      }),
    );
  }

  const markup = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;

  for (const country of countries) {
    for (let si = 0; si < services.length; si++) {
      const svc = services[si];
      const base = SERVICES[si].base;
      for (const server of [1, 2, 3]) {
        const cost = base * (1 + (server - 1) * 0.08) * (country.code === "US" ? 1.15 : 1);
        const price = cost * (1 + markup);
        const stock = server === 3 && si % 5 === 0 ? 0 : 50 + ((si + server) % 7) * 12;
        await prisma.serviceOffer.create({
          data: {
            countryId: country.id,
            serviceId: svc.id,
            server,
            costPrice: new Prisma.Decimal(cost.toFixed(4)),
            price: new Prisma.Decimal(price.toFixed(4)),
            stock,
            enabled: true,
            providerKey: "mock",
          },
        });
      }
    }
  }

  await prisma.providerConfig.createMany({
    data: [
      { key: "mock", name: "Mock SMS Provider", enabled: true, apiKey: "mock-key" },
      { key: "sms-activate", name: "SMS-Activate", enabled: false, baseUrl: "https://api.sms-activate.org" },
      { key: "5sim", name: "5SIM", enabled: false, baseUrl: "https://5sim.net" },
      { key: "grizzlysms", name: "GrizzlySMS", enabled: false },
      { key: "smsbower", name: "SMSBower", enabled: false },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { key: "global_markup_percent", value: String(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") },
      { key: "order_ttl_minutes", value: "15" },
      { key: "cancel_window_seconds", value: "120" },
      { key: "temp_mail_domains", value: JSON.stringify(["mail.tempempire.dev", "inbox.tempempire.dev"]) },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: demo.id,
      title: "Welcome to Temp Empire",
      body: "Your demo wallet is funded. Head to Services to buy an OTP number.",
    },
  });

  console.log("Seed complete");
  console.log(`  Admin: ${admin.email} / ${adminPass}`);
  console.log(`  Demo:  ${demo.email} / ${demoPass}`);
  console.log(`  Demo API key: ${demo.apiKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
