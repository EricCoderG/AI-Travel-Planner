import type { ItineraryDay, ItineraryItem, TravelPreference } from '../types';

interface DoubaoChoice {
  message?: {
    content?: string;
  };
}

interface DoubaoResponse {
  choices?: DoubaoChoice[];
}

export interface ParsedBudgetEntry {
  category: string;
  amount: number;
  currency?: string;
  note?: string;
}

export const buildPrompt = (preference: TravelPreference): string => {
  const { destination, startDate, endDate, budget, companions, themes, notes, currency } = preference;
  return `你是一位专业旅行规划师，请针对以下需求生成详细行程：\n目的地：${destination}\n日期：${startDate} 至 ${endDate}\n预算：${budget} ${currency}\n同行人：${companions}\n偏好：${themes.join(', ')}\n额外备注：${notes ?? '无'}\n\n请输出 JSON，包含：\n- days: 每日安排数组，需列出时间、标题、描述、分类(交通|景点|餐饮|住宿|其他)、可选费用与经纬度\n- estimatedBudget: 整体预算数值\n- budgetBreakdown: 预算拆分数组，例如 [{"category":"交通","amount":3000,"currency":"${currency}","note":"往返机票"}]`;
};

const normalizeItems = (items: any[]): ItineraryItem[] => {
  return items
    .filter(Boolean)
    .map((item) => ({
      time: item.time ?? '待定',
      title: item.title ?? '未命名活动',
      description: item.description ?? '',
      category: ['交通', '景点', '餐饮', '住宿', '其他'].includes(item.category) ? item.category : '其他',
      cost: typeof item.cost === 'number' ? item.cost : undefined,
      location: item.location
    }));
};

const parseBudgets = (rows: any[], preference: TravelPreference): ParsedBudgetEntry[] => {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row) => ({
      category: typeof row.category === 'string' ? row.category : '其他',
      amount: Number(row.amount) || 0,
      currency: typeof row.currency === 'string' ? row.currency : preference.currency,
      note: typeof row.note === 'string' ? row.note : undefined
    }))
    .filter((entry) => entry.amount > 0 && entry.category);
};

const buildFallbackPlan = (preference: TravelPreference): { days: ItineraryDay[]; estimatedBudget: number; budgets: ParsedBudgetEntry[] } => {
  const days: ItineraryDay[] = [];
  if (preference.startDate) {
    const start = new Date(preference.startDate);
    const end = preference.endDate ? new Date(preference.endDate) : new Date(preference.startDate);
    for (let time = start.getTime(); time <= end.getTime(); time += 24 * 60 * 60 * 1000) {
      const date = new Date(time).toISOString().slice(0, 10);
      days.push({ date, items: [] });
    }
  }
  return { days, estimatedBudget: preference.budget, budgets: [] };
};

const parsePlan = (content: string, preference: TravelPreference): { days: ItineraryDay[]; estimatedBudget: number; budgets: ParsedBudgetEntry[] } => {
  try {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    const payload = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
    const days: ItineraryDay[] = Array.isArray(payload.days)
      ? payload.days.map((day: any) => ({
          date: day.date ?? preference.startDate,
          items: Array.isArray(day.items) ? normalizeItems(day.items) : []
        }))
      : [];
    const estimatedBudget = typeof payload.estimatedBudget === 'number' ? payload.estimatedBudget : preference.budget;
    const budgets = parseBudgets(payload.budgetBreakdown ?? payload.budgets, preference);
    return { days, estimatedBudget, budgets };
  } catch (error) {
    console.error('解析豆包响应失败', error);
    return buildFallbackPlan(preference);
  }
};

export const requestItineraryPlan = async (
  preference: TravelPreference,
  apiKey: string
): Promise<{ days: ItineraryDay[]; estimatedBudget: number; budgets: ParsedBudgetEntry[] }> => {
  if (!apiKey) {
    return buildFallbackPlan(preference);
  }

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'ep-m-20251017162015-5bs96',
      messages: [
        {
          role: 'system',
          content: '你是旅行规划助手，擅长将用户需求转化为结构化行程。'
        },
        { role: 'user', content: buildPrompt(preference) }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    console.warn('豆包 API 调用失败', await response.text());
    return buildFallbackPlan(preference);
  }

  const data = (await response.json()) as DoubaoResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return buildFallbackPlan(preference);
  }
  return parsePlan(content, preference);
};
