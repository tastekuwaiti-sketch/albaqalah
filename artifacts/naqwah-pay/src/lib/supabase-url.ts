/** Normalize copy/paste formatting without exposing the configured value. */
export function normalizeSupabaseUrl(value: string): string {
  let url = value.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('SUPABASE_URL_FORMAT');
  }
  if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('SUPABASE_URL_FORMAT');
  }
  if (parsed.hostname === 'supabase.com' || parsed.hostname.endsWith('.supabase.com')) {
    throw new Error('SUPABASE_URL_DASHBOARD');
  }
  if (
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('SUPABASE_URL_NOT_PROJECT_ROOT');
  }
  return parsed.origin;
}
