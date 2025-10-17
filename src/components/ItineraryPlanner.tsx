import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useMutation } from '@tanstack/react-query';
import { requestItineraryPlan } from '../services/doubao';
import VoiceInput from './VoiceInput';
import { usePlannerStore } from '../store/usePlannerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { TravelPreference } from '../types';


const parseVoiceTranscript = (value: string, current: PlannerForm): Partial<PlannerForm> => {
  const normalized = value.replace(/[，,]/g, '|');
  const segments = normalized.split('|').map((item) => item.trim()).filter(Boolean);
  const patch: Partial<PlannerForm> = { notes: value };
  if (segments[0]) {
    patch.destination = segments[0];
  }
  const dateMatch = value.match(/(\d{4}-\d{2}-\d{2})/g);
  if (dateMatch && dateMatch.length) {
    patch.startDate = dateMatch[0];
    if (dateMatch[1]) {
      patch.endDate = dateMatch[1];
    }
  }
  const durationSegment = segments.find((item) => item.includes('天'));
  if (durationSegment) {
    const daysMatch = durationSegment.match(/(\d+)/);
    if (daysMatch) {
      const days = Number(daysMatch[1]);
      const start = patch.startDate ?? current.startDate;
      if (start) {
        const end = dayjs(start).add(Math.max(days - 1, 0), 'day');
        patch.endDate = end.format('YYYY-MM-DD');
      }
    }
  }
  const budgetSegment = segments.find((item) => item.includes('元') || item.toLowerCase().includes('rmb') || item.includes('万'));
  if (budgetSegment) {
    const numberMatch = budgetSegment.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const amount = Number(numberMatch[1]);
      if (budgetSegment.includes('万')) {
        patch.budget = amount * 10000;
      } else {
        patch.budget = amount;
      }
    }
  }
  const themesSegment = segments.find((item) => item.includes('+'));
  if (themesSegment) {
    patch.themes = themesSegment.split(/[+＋]/).map((item) => item.trim()).filter(Boolean);
  }
  const companionsSegment = segments.find((item) => item.includes('带') || item.includes('同行') || item.includes('家庭'));
  if (companionsSegment) {
    patch.companions = companionsSegment;
  }
  return patch;
};
interface PlannerForm extends TravelPreference {
  name: string;
  notes?: string;
}

const createInitialPreference = (currency: string): PlannerForm => ({
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  budget: 0,
  currency,
  companions: '',
  themes: [],
  notes: ''
});

const ItineraryPlanner = () => {
  const [lastPlanId, setLastPlanId] = useState<string | undefined>();
  const [status, setStatus] = useState<'idle' | 'success' | 'empty'>('idle');
  const defaultCurrency = useSettingsStore((state) => state.defaultCurrency);
  const doubaoKey = useSettingsStore((state) => state.doubaoApiKey);
  const createPlan = usePlannerStore((state) => state.createPlan);
  const updatePlan = usePlannerStore((state) => state.updatePlan);
  const [form, setForm] = useState<PlannerForm>(() => createInitialPreference(defaultCurrency));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setForm((prev) => ({ ...prev, currency: defaultCurrency }));
  }, [defaultCurrency]);

  const isFormValid = useMemo(() => form.destination && form.startDate && form.endDate, [form]);

  const mutation = useMutation<{ hasContent: boolean; planId: string }, Error, PlannerForm>({
    mutationFn: async (payload: PlannerForm) => {
      const preference: TravelPreference = {
        destination: payload.destination,
        startDate: payload.startDate,
        endDate: payload.endDate,
        budget: payload.budget,
        currency: payload.currency,
        companions: payload.companions,
        themes: payload.themes,
        notes: payload.notes
      };
      const plan = await createPlan(preference, payload.name || `${payload.destination} 行程`);
      if (!plan) {
        throw new Error('创建行程失败');
      }
      const aiResult = await requestItineraryPlan(preference, doubaoKey);
      const days = aiResult.days.length ? aiResult.days : plan.days;
      await updatePlan({ ...plan, days, estimatedBudget: aiResult.estimatedBudget });
      const hasContent = days.some((day) => day.items.length > 0);
      return { hasContent, planId: plan.id };
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setStatus('idle');
    setLastPlanId(undefined);
    if (!isFormValid) {
      setError('请完整填写目的地与日期');
      return;
    }
    try {
      const result = await mutation.mutateAsync(form);
      setForm(createInitialPreference(defaultCurrency));
      setLastPlanId(result.planId);
      setStatus(result.hasContent ? 'success' : 'empty');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>智能行程规划</h2>
      <VoiceInput
        onTranscript={(value) =>
          setForm((prev) => {
            const patch = parseVoiceTranscript(value, prev);
            return {
              ...prev,
              ...patch,
              themes: patch.themes ?? prev.themes
            };
          })
        }
      />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label>
          行程名称
          <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        </label>
        <label>
          目的地
          <input
            required
            value={form.destination}
            onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
          />
        </label>
        <label>
          开始日期
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </label>
        <label>
          结束日期
          <input
            type="date"
            required
            value={form.endDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </label>
        <label>
          总预算
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(event) => setForm((prev) => ({ ...prev, budget: Number(event.target.value) }))}
          />
        </label>
        <label>
          币种
          <input value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
        </label>
        <label>
          同行人
          <input value={form.companions} onChange={(event) => setForm((prev) => ({ ...prev, companions: event.target.value }))} />
        </label>
        <label>
          偏好标签
          <input
            placeholder="美食, 自驾, 亲子..."
            value={form.themes.join(', ')}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, themes: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))
            }
          />
        </label>
      </div>
      <label>
        备注
        <textarea
          rows={3}
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </label>
      {error && <p className="error">{error}</p>}
      {!doubaoKey && <p className="hint">未填写豆包 API Key 时，将使用默认模板生成行程。</p>}
      {mutation.isPending && <p className="hint">AI 正在生成行程，请稍候...</p>}
      {status === 'success' && lastPlanId && <p className="hint">AI 已生成行程，点击下方按钮查看详细安排。</p>}
      {status === 'empty' && <p className="error">AI 未生成具体安排，请前往详情页手动补充。</p>}
      <p className="hint">语音识别结果会自动填充表单字段，可手动调整。</p>
      <div className="planner-actions">
        <button type="submit" className="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'AI 正在生成...' : '生成行程'}
        </button>
        {lastPlanId && (
          <Link className="secondary-link" to={`/plans/${lastPlanId}`}>查看行程详情</Link>
        )}
      </div>
    </form>
  );
};

export default ItineraryPlanner;
