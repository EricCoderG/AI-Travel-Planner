export interface TravelPreference {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  companions: string;
  themes: string[];
  notes?: string;
}

export interface ItineraryItem {
  time: string;
  title: string;
  description: string;
  category: '交通' | '景点' | '餐饮' | '住宿' | '其他';
  cost?: number;
  location?: string;
}

export interface ItineraryDay {
  date: string;
  items: ItineraryItem[];
}

export interface ItineraryPlan {
  id: string;
  name: string;
  createdAt: string;
  preference: TravelPreference;
  days: ItineraryDay[];
  estimatedBudget: number;
  currency: string;
}

export interface BudgetEntry {
  id: string;
  planId: string;
  category: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  lastLoginAt?: string;
}
