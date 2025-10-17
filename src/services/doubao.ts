import type { ItineraryDay, ItineraryItem, ItineraryPlan, TravelPreference } from '../types';

interface DoubaoChoice {
  message?: {
    content?: string;
  };
}

interface DoubaoResponse {
  choices?: DoubaoChoice[];
}

export const buildPrompt = (preference: TravelPreference): string => {
  const { destination, startDate, endDate, budget, companions, themes, notes } = preference;
  return `你是一位专业旅行规划师，请针对以下需求生成详细行程：\n目的地：${destination}\n日期：${startDate} 至 ${endDate}\n预算：${budget} ${preference.currency}\n同行人：${companions}\n偏好：${themes.join(', ')}\n额外备注：${notes ?? '无'}\n\n输出 JSON，格式：{\n  "days": [{"date": "YYYY-MM-DD", "items": [{"time": "08:00", "title": "", "description": "", "category": "交通|景点|餐饮|住宿|其他", "cost": 0, "location": ""}]}],\n  "estimatedBudget": 12345\n}`;
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

const buildFallbackPlan = (preference: TravelPreference): Pick<ItineraryPlan, 'days' | 'estimatedBudget'> => {
  const days: ItineraryDay[] = [];
  if (preference.startDate) {
    const start = new Date(preference.startDate);
    const end = preference.endDate ? new Date(preference.endDate) : new Date(preference.startDate);
    for (let time = start.getTime(); time <= end.getTime(); time += 24 * 60 * 60 * 1000) {
      const date = new Date(time).toISOString().slice(0, 10);
      days.push({ date, items: [] });
    }
  }
  return { days, estimatedBudget: preference.budget };
};

const parsePlan = (content: string, preference: TravelPreference): Pick<ItineraryPlan, 'days' | 'estimatedBudget'> => {
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
    return { days, estimatedBudget };
  } catch (error) {
    console.error('解析豆包响应失败', error);
    return buildFallbackPlan(preference);
  }
};

export const requestItineraryPlan = async (
  preference: TravelPreference,
  apiKey: string
): Promise<Pick<ItineraryPlan, 'days' | 'estimatedBudget'>> => {
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
      model: 'ep-m-20251017102514-xmn6c',
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
