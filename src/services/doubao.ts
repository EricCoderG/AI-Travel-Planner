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

export interface DoubaoPlanResult {
  days: ItineraryDay[];
  estimatedBudget: number;
  budgets: ParsedBudgetEntry[];
  rawContent: string;
}

export const buildPrompt = (preference: TravelPreference): string => {
  const { destination, startDate, endDate, budget, companions, themes, notes, currency } = preference;
  return [
    '你是一位专业旅行规划师，请针对以下需求生成详细行程：',
    `目的地：${destination}`,
    `日期：${startDate} 至 ${endDate}`,
    `预算：${budget} ${currency}`,
    `同行人：${companions}`,
    `偏好：${themes.join(', ')}`,
    `额外备注：${notes ?? '无'}`,
    '',
    '严格输出如下 JSON 结构，禁止出现未定义的键：',
    '{',
    '  "days": [',
    '    {',
    '      "date": "YYYY-MM-DD",',
    '      "items": [',
    '        {',
    '          "time": "字符串",',
    '          "title": "字符串",',
    '          "description": "字符串",',
    '          "category": "交通"|"景点"|"餐饮"|"住宿"|"其他",',
    '          "cost": 数值,',
    '          "location": "经度,纬度" 或 null',
    '        }',
    '      ]',
    '    }',
    '  ],',
    '  "estimatedBudget": 数值,',
    '  "budgetBreakdown": [',
    '    {',
    '      "category": "交通"|"景点"|"餐饮"|"住宿"|"其他",',
    '      "amount": 数值,',
    `      "currency": "${currency}",`,
    '      "note": "字符串"',
    '    }',
    '  ]',
    '}',
    '',
    '请勿使用 activities、events、time 等其他键名表示每日安排，确保 items 数组存在且字段齐全。'
  ].join('\n');
};

interface NormalizeContext {
  lastCoordinate?: [number, number];
}

const parseLocationString = (value?: string): [number, number] | null => {
  if (!value) {
    return null;
  }
  const parts = value.split(',').map((item) => Number(item.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part) || !Number.isFinite(part))) {
    return null;
  }
  const [first, second] = parts;
  const swapNeeded = Math.abs(first) <= 60 && Math.abs(second) >= 60 && Math.abs(second) <= 180;
  return swapNeeded ? [second, first] : [first, second];
};

const toLocationString = (coord: [number, number]) => `${coord[0]},${coord[1]}`;

const normalizeItems = (items: any[], preference: TravelPreference, context: NormalizeContext): ItineraryItem[] => {
  return items
    .filter(Boolean)
    .map((item) => {
      const latitude = typeof item.latitude === 'number' ? item.latitude : undefined;
      const longitude = typeof item.longitude === 'number' ? item.longitude : undefined;
      const parsedFromLocation = parseLocationString(item.location);
      const parsedFromLatLng =
        latitude !== undefined && longitude !== undefined ? ([longitude, latitude] as [number, number]) : undefined;
      const coordinateCandidate = parsedFromLocation ?? parsedFromLatLng ?? context.lastCoordinate;
      const coordinate = coordinateCandidate && coordinateCandidate.length === 2 ? (coordinateCandidate as [number, number]) : undefined;
      const location = coordinate ? toLocationString(coordinate) : undefined;

      const rawCategory = item.category ?? item.type;
      const category: ItineraryItem['category'] = ['交通', '景点', '餐饮', '住宿', '其他'].includes(rawCategory)
        ? rawCategory
        : '其他';

      const cost =
        typeof item.cost === 'number'
          ? item.cost
          : typeof item.optionalCost === 'number'
            ? item.optionalCost
            : undefined;

      return {
        time: item.time ?? item.slot ?? '待定',
        title: item.title ?? item.name ?? `${preference.destination} 活动`,
        description: item.description ?? item.details ?? '',
        category,
        cost,
        location
      } satisfies ItineraryItem;
    })
    .map((entry) => {
      const coord = parseLocationString(entry.location ?? undefined);
      if (coord) {
        context.lastCoordinate = coord;
      }
      return entry;
    });
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

const buildFallbackPlan = (preference: TravelPreference): DoubaoPlanResult => {
  const days: ItineraryDay[] = [];
  if (preference.startDate) {
    const start = new Date(preference.startDate);
    const end = preference.endDate ? new Date(preference.endDate) : new Date(preference.startDate);
    for (let time = start.getTime(); time <= end.getTime(); time += 24 * 60 * 60 * 1000) {
      const date = new Date(time).toISOString().slice(0, 10);
      days.push({ date, items: [] });
    }
  }
  return { days, estimatedBudget: preference.budget, budgets: [], rawContent: '' };
};

const parsePlan = (content: string, preference: TravelPreference): DoubaoPlanResult => {
  try {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    const payload = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
    const context: NormalizeContext = {};
    const days: ItineraryDay[] = Array.isArray(payload.days)
      ? payload.days.map((day: any) => {
          const rawItemsSource = Array.isArray(day.items)
            ? day.items
            : Array.isArray(day.activities)
                ? day.activities
                : Array.isArray(day.events)
                    ? day.events
                    : undefined;
          const rawItems = rawItemsSource ?? [day];
          const rawDate = day.date ?? day.time ?? day.title ?? preference.startDate;
          const dateString = typeof rawDate === 'string' && rawDate.length ? rawDate : preference.startDate;
          return {
            date: dateString,
            items: normalizeItems(rawItems, preference, context)
          };
        })
      : [];
    const estimatedBudget = typeof payload.estimatedBudget === 'number' ? payload.estimatedBudget : preference.budget;
    const budgets = parseBudgets(payload.budgetBreakdown ?? payload.budgets, preference);
    return { days, estimatedBudget, budgets, rawContent: content };
  } catch (error) {
    console.error('解析豆包响应失败', error);
    return buildFallbackPlan(preference);
  }
};

export const requestItineraryPlan = async (
  preference: TravelPreference,
  apiKey: string,
  prompt?: string
): Promise<DoubaoPlanResult> => {
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
      model: 'doubao-1-5-pro-256k-250115',
      max_tokens: 10000,
      messages: [
        {
          role: 'system',
          content: '你是旅行规划助手，擅长将用户需求转化为结构化行程。'
        },
        { role: 'user', content: prompt ?? buildPrompt(preference) }
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
