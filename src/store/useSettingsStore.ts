import { create } from 'zustand';

export interface SettingsState {
  doubaoApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  amapApiKey: string;
  amapSecurityCode: string;
  voicePreferred: boolean;
  defaultCurrency: string;
  setDoubaoApiKey: (value: string) => void;
  setSupabaseUrl: (value: string) => void;
  setSupabaseKey: (value: string) => void;
  setAmapApiKey: (value: string) => void;
  setAmapSecurityCode: (value: string) => void;
  setVoicePreferred: (value: boolean) => void;
  setDefaultCurrency: (value: string) => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'ai-travel-settings';

const loadSettings = (): Partial<SettingsState> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('读取设置失败', error);
    return {};
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persist = () => {
    const { doubaoApiKey, supabaseUrl, supabaseKey, amapApiKey, amapSecurityCode, voicePreferred, defaultCurrency } = get();
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ doubaoApiKey, supabaseUrl, supabaseKey, amapApiKey, amapSecurityCode, voicePreferred, defaultCurrency })
      );
    } catch (error) {
      console.error('保存设置失败', error);
    }
  };

  return {
    doubaoApiKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    amapApiKey: '',
    amapSecurityCode: '',
    voicePreferred: false,
    defaultCurrency: 'CNY',
    setDoubaoApiKey: (value: string) => {
      set({ doubaoApiKey: value });
      persist();
    },
    setSupabaseUrl: (value: string) => {
      set({ supabaseUrl: value });
      persist();
    },
    setSupabaseKey: (value: string) => {
      set({ supabaseKey: value });
      persist();
    },
    setAmapApiKey: (value: string) => {
      set({ amapApiKey: value });
      persist();
    },
    setAmapSecurityCode: (value: string) => {
      set({ amapSecurityCode: value });
      persist();
    },
    setVoicePreferred: (value: boolean) => {
      set({ voicePreferred: value });
      persist();
    },
    setDefaultCurrency: (value: string) => {
      set({ defaultCurrency: value });
      persist();
    },
    hydrate: () => {
      const data = loadSettings();
      set(data);
    }
  };
});
