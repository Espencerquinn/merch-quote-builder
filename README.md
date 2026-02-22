# Merch Makers - Get a Quote Builder

A lightweight, embeddable merchandise builder tool for instant quote generation and lead capture.

## Features

- **Interactive Design Canvas** - Upload images, add text, choose fonts, drag & resize
- **Live Quote Engine** - Real-time pricing with volume discounts
- **Lead Capture** - Email capture with automatic lead qualification
- **High-Intent Routing** - Identifies and routes high-value opportunities
- **Admin Dashboard** - View all quotes, leads, and conversion metrics

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Canvas**: Fabric.js for design manipulation
- **Backend**: Next.js API Routes
- **Email**: Resend (optional)
- **Storage**: In-memory for MVP (Supabase-ready)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example env file:

```bash
cp .env.example .env.local
```

Configure the following (all optional for MVP):

```env
# Supabase (uses in-memory storage if not set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Resend for email (skips email if not set)
RESEND_API_KEY=your_resend_api_key

# CRM Webhook (logs to console if not set)
CRM_WEBHOOK_URL=your_crm_webhook_url

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the homepage.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, how it works, pricing |
| `/builder` | Interactive quote builder |
| `/admin` | Admin dashboard for viewing quotes and leads |

## Pricing Configuration

Pricing rules are configurable in `src/lib/pricing.ts`:

```typescript
export const pricingConfig = {
  blankCostTiers: [
    { minQty: 1, maxQty: 24, pricePerUnit: 9 },
    { minQty: 25, maxQty: 99, pricePerUnit: 7.5 },
    { minQty: 100, maxQty: Infinity, pricePerUnit: 6 },
  ],
  printCostPerUnit: 4,
  setupFee: {
    threshold: 24,
    amount: 35,
  },
  highIntentThresholds: {
    minQuantity: 100,
    minTotal: 1000,
  },
};
```

## Lead Qualification

Leads are automatically categorized:

- **Self-Serve Small**: < 25 units, < $500 total
- **Mid-Tier**: 25-99 units or $500-$999 total
- **High Intent**: 100+ units, $1000+ total, or "Selling these?" toggled

High-intent leads trigger an upsell modal to capture additional qualification data.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quotes` | POST | Save a quote and send email |
| `/api/quotes` | GET | List all quotes (admin) |
| `/api/webhook/high-intent` | POST | Route high-intent leads to CRM |

## Future Enhancements

The architecture supports:

- Additional blank products
- Multi-print areas (back, sleeves)
- Full checkout flow
- Creator storefront mode
- Supabase persistence
- User accounts

## MVP Constraints

- T-shirt only (1 product)
- Front print only
- No checkout
- No user accounts
- In-memory storage (resets on restart)
