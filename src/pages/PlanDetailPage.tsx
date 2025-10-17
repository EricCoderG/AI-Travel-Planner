import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PlanViewer from '../components/PlanViewer';
import MapSection from '../components/MapSection';
import { usePlannerStore } from '../store/usePlannerStore';

const PlanDetailPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const { plans, budgets, setActivePlan } = usePlannerStore((state) => ({
    plans: state.plans,
    budgets: state.budgets,
    setActivePlan: state.setActivePlan
  }));

  const planExists = useMemo(() => plans.some((plan) => plan.id === planId), [plans, planId]);
  const planCurrency = useMemo(
    () => plans.find((plan) => plan.id === planId)?.currency ?? 'CNY',
    [plans, planId]
  );
  const planBudgetEntries = useMemo(
    () => budgets.filter((entry) => entry.planId === planId),
    [budgets, planId]
  );
  const budgetTotal = useMemo(
    () => planBudgetEntries.reduce((acc, entry) => acc + entry.amount, 0),
    [planBudgetEntries]
  );

  useEffect(() => {
    if (planId && planExists) {
      setActivePlan(planId);
    }
  }, [planId, planExists, setActivePlan]);

  if (!planId) {
    return (
      <div className="page">
        <h1>行程详情</h1>
        <p>未指定行程。</p>
      </div>
    );
  }

  if (!planExists) {
    return (
      <div className="page">
        <h1>行程详情</h1>
        <p>未找到该行程，可能已被删除或尚未生成。</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>行程详情</h1>
      <PlanViewer />
      <section className="card">
        <h2>预算拆分</h2>
        {!planBudgetEntries.length && <p className="hint">AI 暂未生成预算拆分，可重新发起行程规划。</p>}
        {!!planBudgetEntries.length && (
          <>
            <p className="budget-plan-total">
              合计：{budgetTotal.toFixed(2)} {planCurrency}
            </p>
            <div className="budget-table">
              <div className="budget-table-head">
                <span>分类</span>
                <span>金额</span>
                <span>备注</span>
              </div>
              {planBudgetEntries.map((entry) => (
                <div key={entry.id} className="budget-table-row">
                  <span>{entry.category}</span>
                  <span>
                    {entry.amount.toFixed(2)} {entry.currency}
                  </span>
                  <span>{entry.note ?? '-'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <MapSection />
    </div>
  );
};

export default PlanDetailPage;
