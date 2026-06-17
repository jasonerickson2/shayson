# Shayson

The operations dashboard I run my hospitality business from. Six short-term rental units across two buildings, a coffee shop, and bookings landing from Airbnb, Booking.com, VRBO, and my own direct booking site. Before this I was logging into five different places to get one picture of the day. Now it's one screen on my phone.

<!-- screenshots: drop 2-3 here before publishing. Blur or use sample data. Dashboard + calendar + cafe make the best set. -->

## What it does

- **Dashboard** - live KPIs per property and rolled up: occupancy, ADR, RevPAR, revenue against last year
- **Calendar** - all six units on one calendar, color coded by channel, drag to select date ranges
- **Approvals** - pricing proposals from my AI pricing advisor land here. I see the suggested rate, the reasoning, and the pacing data behind it, then approve or deny from my phone. Approved rates push to every channel automatically.
- **Cafe + Orders** - the coffee shop runs on Square, so sales, order history, and daily numbers show up next to the lodging KPIs
- **Messages** - guest messages from every channel in one inbox
- **AI** - chat interface to the pricing advisor
- **Logs** - what the automation did overnight and whether anything failed

## Stack

React 19, TypeScript, Vite, Tailwind, TanStack Query, React Router v7. Mobile-first with pull-to-refresh, because I use this standing in the cafe, not at a desk.

The heavy lifting happens in Supabase Edge Functions (dashboard aggregation, cafe Square sync, pricing proposals API). Those are part of my pricing engine backend, which has its own repo with sanitized samples.

## Running it

```
npm install
cp .env.example .env   # point it at your own backend
npm run dev
```

| Variable | What it is |
|---|---|
| `VITE_API_URL` | Auth backend URL |
| `VITE_FUNCTIONS_BASE` | Base URL of the Supabase edge functions, e.g. https://YOUR-PROJECT.supabase.co/functions/v1 |

Without my backend the pages will load empty. The code is here to show how the frontend is put together: query caching, optimistic approvals, the centralized property config in `src/config/properties.ts` that every page derives from.
