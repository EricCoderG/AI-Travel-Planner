import { useMemo } from 'react';
import { usePlannerStore } from '../store/usePlannerStore';
import { exportPlanAsJson, exportPlanAsPdf } from '../utils/exporters';

const PlanViewer = () => {
  const { plans, activePlanId, setActivePlan, budgets } = usePlannerStore((state) => ({ plans: state.plans, activePlanId: state.activePlanId, setActivePlan: state.setActivePlan, budgets: state.budgets }));
  const activePlan = useMemo(() => plans.find((item) => item.id === activePlanId) ?? plans[0], [plans, activePlanId]);
  const hasContent = useMemo(() => activePlan?.days.some((day) => day.items.length > 0) ?? false, [activePlan]);

  if (!activePlan) {
    return (
      <section className="card">
        <h2>行程详情</h2>
        <p>新建一个行程后，这里会展示每日安排。</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="plan-header">
        <div>
          <h2>{activePlan.name}</h2>
          <p>
            {activePlan.preference.startDate} → {activePlan.preference.endDate}
          </p>
        </div>
        <div className="plan-actions">
          <button type="button" className="link" onClick={() => exportPlanAsPdf(activePlan, budgets)}>导出 PDF</button>
          <button type="button" className="link" onClick={() => exportPlanAsJson(activePlan, budgets)}>导出 JSON</button>
          <select value={activePlan.id} onChange={(event) => setActivePlan(event.target.value)}>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="plan-meta">
        <span>预算：{activePlan.estimatedBudget} {activePlan.currency}</span>
        {activePlan.preference.companions && <span>同行：{activePlan.preference.companions}</span>}
        {!!activePlan.preference.themes.length && <span>偏好：{activePlan.preference.themes.join(' / ')}</span>}
      </div>
      {!hasContent && <p className="hint">AI 暂未生成行程，请手动补充或稍后重试。</p>}
      <div className="plan-days">
        {activePlan.days.map((day) => (
          <div key={day.date} className="plan-day">
            <h3>{day.date}</h3>
            {!day.items.length && <p>暂无安排</p>}
            {day.items.map((item) => (
              <div key={item.title + item.time} className="plan-item">
                <strong>{item.time}</strong>
                <div>
                  <p>{item.title}</p>
                  <small>{item.description}</small>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlanViewer;
