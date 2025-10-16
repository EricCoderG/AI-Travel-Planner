import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import { useSettingsStore } from './useSettingsStore';

interface AuthState {
  user: UserProfile | null;
  authLoading: boolean;
  error?: string;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrateFromSupabase: () => Promise<void>;
}

const toProfile = (user: User | null): UserProfile | null => {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.displayName ?? user.user_metadata?.full_name,
    lastLoginAt: user.last_sign_in_at ?? undefined
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authLoading: false,
  error: undefined,
  signUp: async (email, password, displayName) => {
    const { supabaseKey, supabaseUrl } = useSettingsStore.getState();
    const client = getSupabaseClient(supabaseUrl, supabaseKey);
    if (!client) {
      set({ error: '请先在设置中配置 Supabase URL 与 Key' });
      return;
    }
    set({ authLoading: true, error: undefined });
    const { error, data } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { displayName }
      }
    });
    if (error) {
      set({ authLoading: false, error: error.message });
      return;
    }
    set({ authLoading: false, user: toProfile(data.user) });
  },
  signIn: async (email, password) => {
    const { supabaseKey, supabaseUrl } = useSettingsStore.getState();
    const client = getSupabaseClient(supabaseUrl, supabaseKey);
    if (!client) {
      set({ error: '请先在设置中配置 Supabase URL 与 Key' });
      return;
    }
    set({ authLoading: true, error: undefined });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      set({ authLoading: false, error: error.message });
      return;
    }
    set({ authLoading: false, user: toProfile(data.user) });
  },
  signOut: async () => {
    const { supabaseKey, supabaseUrl } = useSettingsStore.getState();
    const client = getSupabaseClient(supabaseUrl, supabaseKey);
    if (!client) {
      set({ user: null });
      return;
    }
    await client.auth.signOut();
    set({ user: null });
  },
  hydrateFromSupabase: async () => {
    const { supabaseKey, supabaseUrl } = useSettingsStore.getState();
    const client = getSupabaseClient(supabaseUrl, supabaseKey);
    if (!client) {
      return;
    }
    const {
      data: { session }
    } = await client.auth.getSession();
    set({ user: toProfile(session?.user ?? null) });
  }
}));
