# Merch Makers - Get a Quote Builder

A lightweight, embeddable merchandise builder tool for instant quote generation and lead capture.

## Features

- **Interactive Design Canvas** - Upload images, add text, choose fonts, drag & resize
- **Live Quote Engine** - Real-time pricing with volume discounts
- **Lead Capture** - Email capture with automatic lead qualification
- **High-Intent Routing** - Identifies and routes high-value opportunities
- **Multi-Provider Product Catalog** - Pluggable product providers (AS Colour, custom/static products)
- **Admin Dashboard** - View all quotes, leads, and conversion metrics

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Canvas**: Fabric.js for design manipulation
- **Backend**: Next.js API Routes
- **Email**: Resend (optional)
- **Storage**: In-memory for MVP

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

Then fill in your credentials:

```env
# AS Colour API (required for AS Colour product provider)
ASCOLOUR_API_URL=https://api.ascolour.co.nz/v1
ASCOLOUR_SUBSCRIPTION_KEY=your_subscription_key
ASCOLOUR_EMAIL=your_email
ASCOLOUR_PASSWORD=your_password

# Resend for email (optional - skips email if not set)
# RESEND_API_KEY=your_resend_api_key

# CRM Webhook (optional - logs to console if not set)
# CRM_WEBHOOK_URL=your_crm_webhook_url

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
| `/builder?product=ascolour:5026` | Builder with a specific product loaded |
| `/admin` | Admin dashboard for viewing quotes and leads |

## Product Provider System

The product catalog is powered by a pluggable provider system. Each provider implements the `ProductProvider` interface and supplies normalized product data to the client. The client never knows which provider is serving the data.

### How it works

1. **Compound IDs** - Products are identified by `provider:id` strings (e.g. `ascolour:5026`, `static:snow-washed-oversized-tee`). The client passes these opaque IDs around; only the server parses them.
2. **Normalized types** - All providers return the same shapes: `ProductSummary` for listing, `ProductDetail` for full product data including colours, images, views, and sizes.
3. **Single API surface** - Two generic endpoints serve all providers:
   - `GET /api/products` - Lists products from all registered providers
   - `GET /api/products/:compoundId` - Gets full detail for one product

### Built-in providers

| Provider | ID | Description |
|----------|----|-------------|
| AS Colour | `ascolour` | ~623 wholesale products via AS Colour API |
| Static | `static` | Hardcoded default product for fallback/demo |

### Adding a new provider

1. Create `src/lib/providers/yourprovider/adapter.ts` implementing `ProductProvider`:

```typescript
import type { ProductProvider, ProductSummary, ProductDetail } from '../types';

export const yourProvider: ProductProvider = {
  id: 'yourprovider',

  async listProducts(): Promise<ProductSummary[]> {
    // Return normalized product summaries
  },

  async getProduct(productId: string): Promise<ProductDetail> {
    // Return full product detail with colours, images, views
  },
};
```

2. Register it in `src/lib/providers/init.ts`:

```typescript
import { yourProvider } from './yourprovider/adapter';
registerProvider(yourProvider);
```

That's it — the new provider's products will appear in the product selector and work with the builder automatically.

### Key files

| File | Purpose |
|------|---------|
| `src/lib/providers/types.ts` | Normalized types & `ProductProvider` interface |
| `src/lib/providers/registry.ts` | Provider registry & compound ID resolver |
| `src/lib/providers/init.ts` | Registers all providers at startup |
| `src/lib/providers/ascolour/adapter.ts` | AS Colour provider |
| `src/lib/providers/static/adapter.ts` | Static/default provider |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List all products from all providers |
| `/api/products/:compoundId` | GET | Get full product detail by compound ID |
| `/api/quotes` | POST | Save a quote and send email |
| `/api/quotes` | GET | List all quotes (admin) |
| `/api/webhook/high-intent` | POST | Route high-intent leads to CRM |

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
