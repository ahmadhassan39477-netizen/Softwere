# Platform Listing Manager

A modular SaaS dashboard for managing products, official marketplace accounts, compliant publishing workflows, and Facebook Page conversations.

## Included

- Email/password signup and login with NextAuth.js credentials sessions
- PostgreSQL product library with full create, edit, search, and delete flows
- OpenAI-powered Facebook listing rewrite
- Official Facebook Login connection for one or more managed Pages
- Facebook Commerce Catalog publishing through the Graph API
- Compliant Marketplace Manual Assist with copy buttons and a direct link to listing creation
- Facebook Page Messaging webhook ingestion and optional AI auto-replies
- Dashboard totals for products, connected accounts, and messages received today
- Encrypted Facebook Page access tokens (AES-256-GCM)

Platform Listing Manager does **not** scrape Facebook, automate browser activity, create Facebook accounts, or attempt to publish to Marketplace through an unsupported API.

## Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, NextAuth.js, OpenAI.

## Local setup

1. Install Node.js 20+ and PostgreSQL.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

4. Fill in `.env`. Generate secrets with:

   ```bash
   openssl rand -base64 32
   openssl rand -hex 32
   ```

   Use the base64 value for `NEXTAUTH_SECRET` and the 64-character hex value for `TOKEN_ENCRYPTION_KEY`.

5. Create the database schema:

   ```bash
   npm run db:migrate -- --name init
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Meta app setup

1. Create a Meta app at [Meta for Developers](https://developers.facebook.com/) and add Facebook Login.
2. Add this exact valid OAuth redirect URI:

   ```text
   http://localhost:3000/api/auth/facebook/callback
   ```

   Add the production equivalent when deploying.
3. Configure the app ID and secret in `.env`.
4. Request the Graph API v19.0 permissions used by Facebook connection: `pages_show_list`, `pages_read_engagement`, `pages_messaging`, and `business_management`. Meta App Review and Business Verification may be required before use by people without an app role. Shop catalog publishing additionally requires `catalog_management`.
5. Add the Webhooks product, subscribe the app to the Page `messages` field, and configure:

   ```text
   Callback URL: https://YOUR_DOMAIN/api/webhooks/facebook
   Verify token: the value of FACEBOOK_WEBHOOK_VERIFY_TOKEN
   ```

6. In Accounts, connect Facebook and add the Commerce Catalog ID to each Page that should publish Shop products.

Page tokens are encrypted before storage. Use HTTPS in production and keep `TOKEN_ENCRYPTION_KEY`, `FACEBOOK_APP_SECRET`, and `OPENAI_API_KEY` in a managed secrets service.

## AI behavior

The listing rewriter returns a title and description, adds five bullets, and targets fewer than 150 words. Users should review generated copy.

AI auto-reply only runs when enabled for a connected Page and when an active product is available as context. For a new conversation, the MVP associates the most recently updated active product. Replies are saved in the inbox and identify the sender as an AI assistant. Production deployments should add explicit conversation-to-product selection where message metadata does not identify a product.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:studio
```

## Architecture

- `src/lib/facebook.ts` contains the official Facebook connector.
- `src/lib/openai.ts` contains listing and reply generation.
- `src/app/api/webhooks/facebook` handles verified Meta webhook events.
- `src/app/api/publish/facebook-shop` publishes to a Commerce Catalog.
- Prisma uses a `Platform` enum so eBay and Etsy connectors can be added without changing the product library.
