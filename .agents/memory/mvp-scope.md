---
name: MVP scope and delivery
description: User-defined scope, delivery steps, and infrastructure boundaries for Naqwah Pay.
---

Naqwah Pay targets international students and flatmates sharing grocery costs. The MVP is limited to wallet balance/top-up, splitting a shared grocery order, and payment history. Remittances and smart cards are future vision, not current scope.

**Why:** The user explicitly requested these features only.

**How to apply:** Work in small runnable steps. The requested sequence is homepage, Supabase persistence for one thing, testing, then GitHub. The intended stack is Replit for development, GitHub for code, Vercel for publishing, and Supabase for data/backend. Keep Supabase configuration in Replit Secrets and Vercel environment variables, not source. Any actual payment integration must use Stripe test mode only.
