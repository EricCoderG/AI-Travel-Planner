import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let cacheKey = '';

export const getSupabaseClient = (url: string, key: string): SupabaseClient | null => {
  if (!url || !key) {
    return null;
  }
  const nextKey = `${url}|${key}`;
  if (!client || cacheKey !== nextKey) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        storageKey: 'ai-travel-auth'
      }
    });
    cacheKey = nextKey;
  }
  return client;
};
