import { useEffect, useMemo, useState } from 'react';
import { usePlannerStore } from '../store/usePlannerStore';
import type { BudgetEntry } from '../types';

interface FormState {
  planId: string;
  category: string;
  amount: number;
  currency: string;
  note?: string;
}

const emptyForm: FormState = {
  planId: '',
  category: '交通',
  amount: 0,
  currency: 'CNY',
  note: ''
};

const BudgetTracker = () => {
  const { plans, budgets, addBudgetEntry, removeBudgetEntry } = usePlannerStore((state) => ({
    plans: state.plans,
    budgets: state.budgets,
    addBudgetEntry: state.addBudgetEntry,
    removeBudgetEntry: state.removeBudgetEntry
  }));
  const [form, setForm] = useState<FormState>({ ...emptyForm, planId: plans[0]?.id ?? '' });
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    if (!form.planId && plans[0]) {
      setForm((prev) => ({ ...prev, planId: plans[0].id }));
    } else if (form.planId && !plans.find((plan) => plan.id === form.planId)) {
      setForm((prev) => ({ ...prev, planId: plans[0]?.id ?? '' }));
    }
  }, [plans, form.planId]);

  const totalByPlan = useMemo(() => {
    return plans.map((plan) => {
      const total = budgets
        .filter((entry) => entry.planId === plan.id)
        .reduce((acc, entry) => acc + entry.amount, 0);
      return { plan, total };
    });
  }, [plans, budgets]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.planId || !form.category || !form.amount) {
      return;
    }
    try {
      await addBudgetEntry({ ...form });
      setError(undefined);
      setForm({ ...emptyForm, planId: form.planId });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="grid">
      <form className="card" onSubmit={handleSubmit}>
        <h2>记录开销</h2>
        {error && <p className="error">{error}</p>}
        <label>
          关联行程
          <select
            required
            value={form.planId}
            onChange={(event) => setForm((prev) => ({ ...prev, planId: event.target.value }))}
          >
            <option value="" disabled>
              选择行程
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          分类
          <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
            {['交通', '住宿', '餐饮', '门票', '购物', '其他'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          金额
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
          />
        </label>
        <label>
          币种
          <input value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
        </label>
        <label>
          备注
          <input value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
        </label>
        <button type="submit" className="primary">
          保存开销
        </button>
      </form>
      <section className="card">
        <h2>预算总览</h2>
        {!totalByPlan.length && <p>暂无预算记录</p>}
        {totalByPlan.map(({ plan, total }) => (
          <div key={plan.id} className="budget-row">
            <strong>{plan.name}</strong>
            <span>
              {total.toFixed(2)} {plan.currency}
            </span>
          </div>
        ))}
        {budgets.length > 0 && (
          <div className="budget-table">
            <div className="budget-table-head">
              <span>日期</span>
              <span>分类</span>
              <span>金额</span>
              <span>备注</span>
              <span>操作</span>
            </div>
            {budgets.map((entry) => (
              <div key={entry.id} className="budget-table-row">
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                <span>{entry.category}</span>
                <span>
                  {entry.amount.toFixed(2)} {entry.currency}
                </span>
                <span>{entry.note}</span>
                <button
                  type="button"
                  className="link"
                  onClick={async () => {
                    try {
                      await removeBudgetEntry(entry.id);
                      setError(undefined);
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BudgetTracker;
