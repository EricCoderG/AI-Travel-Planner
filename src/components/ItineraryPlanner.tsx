import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useMutation } from '@tanstack/react-query';
import { buildPrompt, requestItineraryPlan } from '../services/doubao';
import VoiceInput from './VoiceInput';
import { usePlannerStore } from '../store/usePlannerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { TravelPreference } from '../types';


const parseVoiceTranscript = (value: string, current: PlannerForm): Partial<PlannerForm> => {
  const patch: Partial<PlannerForm> = { notes: value };
  const normalized = value.replace(/[，。,、]/g, ' ');

  // 目的地：寻找“去XXX”模式，避免误捕后续文本
  const destinationRegex = /去(?<dest>[\u4e00-\u9fa5A-Za-z\s]{1,20})(?:玩|旅游|旅行)?/;
  const destinationMatch = normalized.match(destinationRegex);
  if (destinationMatch?.groups?.dest) {
    patch.destination = destinationMatch.groups.dest.trim();
  }

  // 时间：日期或天数
  const dateMatch = value.match(/(\d{4}[年/-]\d{1,2}[月/-]\d{1,2})/g);
  if (dateMatch && dateMatch.length) {
    const [startRaw, endRaw] = dateMatch;
    const normalizeDate = (input: string) => input.replace(/年|月/g, '-').replace(/日|号/g, '');
    patch.startDate = normalizeDate(startRaw);
    if (endRaw) {
      patch.endDate = normalizeDate(endRaw);
    }
  }
  const durationMatch = value.match(/(\d+)(?:个)?天/);
  if (durationMatch) {
    const days = Number(durationMatch[1]);
    const start = patch.startDate ?? current.startDate;
    if (start) {
      const end = dayjs(start).add(Math.max(days - 1, 0), 'day');
      patch.endDate = end.format('YYYY-MM-DD');
    }
  }

  // 预算
  const budgetRegex = /预算[\s]*([\d\.]+)(万)?(元|块|人民币|rmb)?/i;
  const budgetMatch = normalized.match(budgetRegex);
  if (budgetMatch) {
    const amount = Number(budgetMatch[1]);
    if (!Number.isNaN(amount)) {
      patch.budget = budgetMatch[2] ? amount * 10000 : amount;
    }
  }

  // 同行人
  const companionsPatterns: { regex: RegExp; label: string }[] = [
    { regex: /带(孩子|宝宝|小孩|儿子|女儿)/, label: '带孩子' },
    { regex: /(夫妻|情侣|爱人|伴侣)/, label: '情侣同行' },
    { regex: /(朋友|闺蜜|兄弟)/, label: '朋友同行' },
    { regex: /(父母|家人|全家|家庭)/, label: '家庭出行' },
    { regex: /(同事|同伴|团队)/, label: '同事出行' }
  ];
  const foundCompanion = companionsPatterns.find((pattern) => pattern.regex.test(value));
  if (foundCompanion) {
    patch.companions = foundCompanion.label;
  }

  // 偏好
  const themeKeywords = ['美食', '购物', '亲子', '动漫', '文化', '海岛', '自然', '雪景', '摄影', '历史', '徒步'];
  const themes: string[] = [];
  const likeMatch = value.match(/喜欢([^。；;，]+)/);
  if (likeMatch?.[1]) {
    likeMatch[1]
      .split(/和|及|与|、|,|，/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => themes.push(item));
  }
  themeKeywords.forEach((keyword) => {
    if (value.includes(keyword) && !themes.includes(keyword)) {
      themes.push(keyword);
    }
  });
  if (themes.length) {
    patch.themes = themes;
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
  const { createPlan, updatePlan, replaceBudgetsForPlan, logAiGeneration } = usePlannerStore((state) => ({
    createPlan: state.createPlan,
    updatePlan: state.updatePlan,
    replaceBudgetsForPlan: state.replaceBudgetsForPlan,
    logAiGeneration: state.logAiGeneration
  }));
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
      const prompt = buildPrompt(preference);
      const aiResult = await requestItineraryPlan(preference, doubaoKey, prompt);
      const days = aiResult.days.length ? aiResult.days : plan.days;
      await updatePlan({ ...plan, days, estimatedBudget: aiResult.estimatedBudget });
      await replaceBudgetsForPlan(plan.id, aiResult.budgets);
      await logAiGeneration({ planId: plan.id, prompt, response: aiResult.rawContent });
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
      {form.notes && (
        <div className="voice-transcript">
          <label>语音识别结果</label>
          <textarea readOnly rows={2} value={form.notes} />
        </div>
      )}
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
