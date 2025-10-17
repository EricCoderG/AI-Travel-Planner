import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { useSettingsStore } from './useSettingsStore';
import { getSupabaseClient } from '../services/supabaseClient';
import type { ParsedBudgetEntry } from '../services/doubao';
import type { BudgetEntry, ItineraryPlan, TravelPreference } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_REQUIRED_MESSAGE = '请先在设置中配置 Supabase，并登录账户后再操作。';

interface PlannerState {
  plans: ItineraryPlan[];
  budgets: BudgetEntry[];
  activePlanId?: string;
  loading: boolean;
  error?: string;
  setActivePlan: (planId?: string) => void;
  createPlan: (preference: TravelPreference, name?: string) => Promise<ItineraryPlan | undefined>;
  updatePlan: (plan: ItineraryPlan) => Promise<void>;
  removePlan: (planId: string) => Promise<void>;
  replaceBudgetsForPlan: (planId: string, entries: ParsedBudgetEntry[]) => Promise<void>;
  logAiGeneration: (payload: { planId: string; prompt: string; response: string }) => Promise<void>;
  loadInitialData: () => Promise<void>;
  syncToSupabase: () => Promise<void>;
}

const buildEmptyPlan = (preference: TravelPreference): ItineraryPlan => {
  const start = preference.startDate;
  const end = preference.endDate;
  const days: ItineraryPlan['days'] = [];
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
      days.push({
        date: current.toISOString().slice(0, 10),
        items: []
      });
    }
  }
  return {
    id: nanoid(),
    name: `${preference.destination} 行程`,
    createdAt: new Date().toISOString(),
    preference,
    days,
    estimatedBudget: preference.budget,
    currency: preference.currency
  };
};

const selectSupabase = () => {
  const { supabaseKey, supabaseUrl } = useSettingsStore.getState();
  const client = getSupabaseClient(supabaseUrl, supabaseKey);
  const user = useAuthStore.getState().user;
  return { client, user };
};

const handleSupabaseError = (clientError: { message: string } | null, set: (state: Partial<PlannerState>) => void) => {
  if (clientError) {
    set({ error: clientError.message });
    throw new Error(clientError.message);
  }
};

export const usePlannerStore = create<PlannerState>((set, get) => {
  const requireSupabase = (options?: { silent?: boolean }): { client: SupabaseClient | null; user: { id: string } | null } => {
    const { client, user } = selectSupabase();
    if (!client || !user) {
      if (!options?.silent) {
        set({ error: SUPABASE_REQUIRED_MESSAGE });
      }
      return { client: null, user: null };
    }
    return { client, user };
  };

  const refreshFromSupabase = async (client: SupabaseClient, userId: string) => {
    const [planResponse, budgetResponse] = await Promise.all([
      client.from('plans').select('*').eq('user_id', userId),
      client.from('budgets').select('*').eq('user_id', userId)
    ]);

    handleSupabaseError(planResponse.error, set);
    handleSupabaseError(budgetResponse.error, set);

    const plans = (planResponse.data ?? []).map((row: any) => row.data as ItineraryPlan);
    const budgets = (budgetResponse.data ?? []).map((row: any) => row.data as BudgetEntry);
    set({
      plans,
      budgets,
      activePlanId: get().activePlanId && plans.some((plan) => plan.id === get().activePlanId)
        ? get().activePlanId
        : plans[0]?.id,
      loading: false,
      error: undefined
    });
  };

  return {
    plans: [],
    budgets: [],
    activePlanId: undefined,
    loading: false,
    error: undefined,
    setActivePlan: (planId) => set({ activePlanId: planId }),
    createPlan: async (preference, name) => {
      const { client, user } = requireSupabase();
      if (!client || !user) {
        throw new Error(SUPABASE_REQUIRED_MESSAGE);
      }
      const plan = buildEmptyPlan(preference);
      if (name) {
        plan.name = name;
      }
      const { error } = await client.from('plans').upsert({ id: plan.id, user_id: user.id, data: plan });
      handleSupabaseError(error, set);
      const nextPlans = [...get().plans.filter((item) => item.id !== plan.id), plan];
      set({ plans: nextPlans, activePlanId: plan.id, error: undefined });
      return plan;
    },
    updatePlan: async (plan) => {
      const { client, user } = requireSupabase();
      if (!client || !user) {
        throw new Error(SUPABASE_REQUIRED_MESSAGE);
      }
      const { error } = await client.from('plans').upsert({ id: plan.id, user_id: user.id, data: plan });
      handleSupabaseError(error, set);
      const plans = get().plans.map((item) => (item.id === plan.id ? plan : item));
      set({ plans, error: undefined });
    },
    removePlan: async (planId) => {
      const { client, user } = requireSupabase();
      if (!client || !user) {
        throw new Error(SUPABASE_REQUIRED_MESSAGE);
      }
      const prevPlans = get().plans;
      const prevBudgets = get().budgets;
      set({
        plans: prevPlans.filter((plan) => plan.id !== planId),
        budgets: prevBudgets.filter((entry) => entry.planId !== planId),
        activePlanId: get().activePlanId === planId ? undefined : get().activePlanId,
        error: undefined
      });
      const { error } = await client.from('plans').delete().eq('id', planId).eq('user_id', user.id);
      handleSupabaseError(error, set);
      await client.from('budgets').delete().eq('plan_id', planId).eq('user_id', user.id);
      await refreshFromSupabase(client, user.id);
    },
    replaceBudgetsForPlan: async (planId, entries) => {
      const { client, user } = requireSupabase();
      if (!client || !user) {
        throw new Error(SUPABASE_REQUIRED_MESSAGE);
      }

      const plan = get().plans.find((item) => item.id === planId);
      const fallbackCurrency = plan?.currency ?? useSettingsStore.getState().defaultCurrency ?? 'CNY';
      const normalized: BudgetEntry[] = entries.map((entry) => ({
        id: nanoid(),
        planId,
        category: entry.category,
        amount: entry.amount,
        currency: entry.currency ?? fallbackCurrency,
        note: entry.note,
        createdAt: new Date().toISOString()
      }));

      const { error: deleteError } = await client.from('budgets').delete().eq('plan_id', planId).eq('user_id', user.id);
      handleSupabaseError(deleteError, set);

      if (normalized.length) {
        const payload = normalized.map((entry) => ({ id: entry.id, user_id: user.id, plan_id: planId, data: entry }));
        const { error: upsertError } = await client.from('budgets').upsert(payload);
        handleSupabaseError(upsertError, set);
      }

      const budgets = [...get().budgets.filter((entry) => entry.planId !== planId), ...normalized];
      set({ budgets, error: undefined });
    },
    logAiGeneration: async ({ planId, prompt, response }) => {
      const { client, user } = requireSupabase();
      if (!client || !user) {
        throw new Error(SUPABASE_REQUIRED_MESSAGE);
      }
      const logRecord = {
        id: nanoid(),
        user_id: user.id,
        plan_id: planId,
        prompt,
        response,
        created_at: new Date().toISOString()
      };
      const { error } = await client.from('ai_generation_logs').insert(logRecord);
      handleSupabaseError(error, set);
    },
    loadInitialData: async () => {
      set({ loading: true, error: undefined });
      const { client, user } = requireSupabase({ silent: true });
      if (!client || !user) {
        set({ plans: [], budgets: [], loading: false });
        return;
      }
      try {
        await refreshFromSupabase(client, user.id);
      } catch (error) {
        console.error(error);
        set({ loading: false });
        throw error;
      }
    },
    syncToSupabase: async () => {
      const { client, user } = requireSupabase();
      if (!client || !user) {
        throw new Error(SUPABASE_REQUIRED_MESSAGE);
      }
      const { plans, budgets } = get();
      const planPayload = plans.map((plan) => ({ id: plan.id, user_id: user.id, data: plan }));
      const budgetPayload = budgets.map((entry) => ({ id: entry.id, user_id: user.id, plan_id: entry.planId, data: entry }));
      const { error: planError } = await client.from('plans').upsert(planPayload);
      handleSupabaseError(planError, set);
      const { error: budgetError } = await client.from('budgets').upsert(budgetPayload);
      handleSupabaseError(budgetError, set);
    }
  };
});
