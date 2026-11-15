# Supabase setup for Naqwah Pay

1. In Supabase, enable anonymous sign-ins under **Authentication → Providers**.
   The app creates a private anonymous session in the browser; it does not add a
   sign-in screen.
2. Open **SQL Editor** and run `supabase/setup.sql`.
3. Add these Replit Secrets for the web app:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart the `Naqwah Pay` web workflow and try a demo top-up. Refresh the page
   to confirm the saved top-up remains in the wallet balance and activity list.

Only demo top-ups are stored by this step. The starting wallet balance and
sample purchases remain illustrative UI data; order splits are still local
demo interactions. No real payment details or money are processed.

The anon key is designed for browser use, so it is not a server secret. Keep
the table's row-level security policies enabled; never use a Supabase
`service_role` key in the browser or in `VITE_` variables.
