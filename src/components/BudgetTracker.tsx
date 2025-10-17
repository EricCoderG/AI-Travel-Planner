import { useMemo } from 'react';
import { usePlannerStore } from '../store/usePlannerStore';

const BudgetTracker = () => {
  const { plans, budgets } = usePlannerStore((state) => ({ plans: state.plans, budgets: state.budgets }));

  const summary = useMemo(() => {
    return plans.map((plan) => {
      const entries = budgets.filter((entry) => entry.planId === plan.id);
      const total = entries.reduce((acc, entry) => acc + entry.amount, 0);
      return { plan, entries, total };
    });
  }, [plans, budgets]);

  return (
    <section className="card">
      <h2>AI 预算概览</h2>
      <p className="hint">预算数据由 AI 自动分析生成，重新规划行程时会同步刷新。</p>
      {!plans.length && <p>暂无行程，请先通过“智能规划”生成行程。</p>}
      {summary.map(({ plan, entries, total }) => (
        <div key={plan.id} className="budget-plan-block">
          <div className="budget-plan-header">
            <div>
              <strong>{plan.name}</strong>
              <p>
                {plan.preference.startDate} → {plan.preference.endDate}
              </p>
            </div>
            <span className="budget-plan-total">
              {total.toFixed(2)} {plan.currency}
            </span>
          </div>
          {!entries.length && <p className="hint">AI 尚未生成预算，可稍后重新触发行程规划。</p>}
          {!!entries.length && (
            <div className="budget-table">
              <div className="budget-table-head">
                <span>分类</span>
                <span>金额</span>
                <span>备注</span>
              </div>
              {entries.map((entry) => (
                <div key={entry.id} className="budget-table-row">
                  <span>{entry.category}</span>
                  <span>
                    {entry.amount.toFixed(2)} {entry.currency}
                  </span>
                  <span>{entry.note ?? '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};

export default BudgetTracker;
