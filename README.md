# Seesaw

A real-time Shopify data dashboard built with Next.js, Supabase, and Shopify OAuth.

## Features

- 🔐 **Shopify OAuth** - Connect multiple Shopify stores securely
- 📦 **Data Sync** - Initial sync of past 90 days of orders, products, customers, and inventory
- ⚡ **Real-time Updates** - Live updates via Shopify webhooks + Supabase Realtime
- 🏪 **Multi-Store** - Switch between connected stores with a dropdown
- 📊 **Dashboard** - Overview stats, recent orders, and live activity feed
- 🔒 **Row Level Security** - Multi-tenant data isolation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email + password)
- **Shopify**: OAuth + REST/GraphQL APIs
- **Styling**: Tailwind CSS + shadcn/ui
- **Real-time**: Supabase Realtime (Postgres Changes)

## Getting Started

### Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Shopify Partner Account**: Sign up at [partners.shopify.com](https://partners.shopify.com)
3. **Shopify App**: Create an app in your Partner Dashboard

### 1. Clone and Install

```bash
git clone <your-repo>
cd seesaw
npm install
```

### 2. Set Up Supabase

1. Go to your Supabase project's SQL Editor
2. Run the schema from `supabase/schema.sql`
3. Enable Realtime on the `realtime_events` table:
   - Go to Database > Replication
   - Add `realtime_events` to the publication

### 3. Configure Shopify App

In your Shopify Partner Dashboard:

1. Create a new app (or use existing)
2. Set **App URL**: `https://your-domain.com/dashboard`
3. Set **Allowed redirection URL(s)**: `https://your-domain.com/api/auth/shopify/callback`
4. Note your **API key** and **API secret key**

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)
- `SHOPIFY_API_KEY` - Shopify app API key
- `SHOPIFY_API_SECRET` - Shopify app API secret
- `HOST` - Your app's public URL (e.g., `https://your-app.vercel.app`)

### 5. Run Development Server

```bash
npm run dev
```

For Shopify OAuth to work locally, you need a public HTTPS URL. Use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Then set `HOST` to your ngrok URL.

### 6. Register Webhooks

After connecting your first store, register webhooks in the Shopify Partner Dashboard:

**Webhook Topics to Register:**
- `orders/create`
- `orders/updated`
- `orders/paid`
- `orders/cancelled`
- `orders/fulfilled`
- `products/create`
- `products/update`
- `products/delete`
- `customers/create`
- `customers/update`
- `inventory_levels/update`
- `app/uninstalled`

**Webhook URL**: `https://your-domain.com/api/webhooks/shopify`

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/shopify/         # OAuth routes
│   │   └── webhooks/shopify/     # Webhook handler
│   └── dashboard/                # Dashboard pages
│       ├── orders/
│       ├── products/
│       ├── customers/
│       ├── inventory/
│       ├── activity/
│       └── settings/
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── store-switcher.tsx        # Multi-store dropdown
│   ├── dashboard-nav.tsx         # Sidebar navigation
│   └── realtime-indicator.tsx    # Live connection status
├── lib/
│   ├── shopify/
│   │   ├── config.ts             # Shopify API setup
│   │   ├── session.ts            # Token storage
│   │   ├── sync.ts               # Initial data sync
│   │   └── webhook-handlers.ts   # Process webhooks
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── admin.ts              # Admin client (service role)
│   ├── context/
│   │   └── shop-context.tsx      # Shop state management
│   └── hooks/
│       └── use-realtime.ts       # Realtime subscriptions
└── supabase/
    └── schema.sql                # Database schema
```

## How It Works

### OAuth Flow

1. User clicks "Connect Store" and enters their Shopify domain
2. Redirected to Shopify OAuth consent screen
3. On approval, callback exchanges code for offline access token
4. Token stored in `shops` table, linked to Supabase user
5. Initial sync starts (products, customers, orders from past 90 days)

### Real-time Updates

1. Shopify sends webhook on data change (e.g., new order)
2. `/api/webhooks/shopify` validates HMAC signature
3. Data upserted to relevant table (orders, products, etc.)
4. Event inserted into `realtime_events` table
5. Supabase Realtime broadcasts to subscribed clients
6. React hooks update UI instantly

### Multi-tenancy

- Each shop has unique ID
- `shop_users` table links Supabase users to shops
- Row Level Security (RLS) ensures users only see their shops' data
- Store switcher updates `currentShop` in React context

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Environment Variables in Production

Make sure to set all variables from `.env.example` in your hosting platform.

## API Scopes

The app requests these Shopify OAuth scopes:
- `read_products` - View products
- `read_orders` - View orders
- `read_customers` - View customers
- `read_inventory` - View inventory levels
- `read_locations` - View locations

## License

MIT
