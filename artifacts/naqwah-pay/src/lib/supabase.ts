import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from './supabase-url';

export type SavedWalletTopup = {
  id: string;
  amount: number;
  createdAt: string;
};

type WalletTopupRow = {
  id: string;
  amount: number | string;
  created_at: string;
};

let client: SupabaseClient | undefined;

function getClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  }
  if (!client) {
    client = createClient(normalizeSupabaseUrl(url), anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

async function getAnonymousUserId(supabase: SupabaseClient) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user.id) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user?.id) {
    throw new Error('Supabase did not return an anonymous user.');
  }
  return data.user.id;
}

function parseRow(row: WalletTopupRow): SavedWalletTopup {
  return {
    id: row.id,
    amount: Number(row.amount),
    createdAt: row.created_at,
  };
}

export async function loadWalletTopups(): Promise<SavedWalletTopup[]> {
  const supabase = getClient();
  await getAnonymousUserId(supabase);
  const { data, error } = await supabase
    .from('wallet_topups')
    .select('id, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as WalletTopupRow[]).map(parseRow);
}

export async function saveWalletTopup(
  amount: number,
): Promise<SavedWalletTopup> {
  const supabase = getClient();
  const userId = await getAnonymousUserId(supabase);
  const { data, error } = await supabase
    .from('wallet_topups')
    .insert({ user_id: userId, amount })
    .select('id, amount, created_at')
    .single();
  if (error) throw error;
  return parseRow(data as WalletTopupRow);
}
