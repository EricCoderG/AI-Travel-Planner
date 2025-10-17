import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlannerStore } from '../store/usePlannerStore';
import dayjs from 'dayjs';

const DashboardPage = () => {
  const { plans, budgets } = usePlannerStore((state) => ({ plans: state.plans, budgets: state.budgets }));

  const summary = useMemo(() => {
    if (!plans.length) {
      return null;
    }
    const totalBudget = budgets.reduce((acc, entry) => acc + entry.amount, 0);
    const upcoming = plans
      .filter((plan) => dayjs(plan.preference.startDate).isAfter(dayjs().subtract(1, 'day')))
      .sort((a, b) => dayjs(a.preference.startDate).unix() - dayjs(b.preference.startDate).unix())[0];
    return {
      totalPlans: plans.length,
      totalBudget,
      upcoming
    };
  }, [plans, budgets]);

  const previewPlans = useMemo(() => plans.slice(0, 5), [plans]);

  return (
    <div className="page">
      <h1>旅行概览</h1>
      {!summary && <p>还没有行程计划，点击左侧的“智能规划”开始创建。</p>}
      {summary && (
        <>
          <div className="dashboard-cards">
            <section className="card">
              <h2>累计行程</h2>
              <p>{summary.totalPlans}</p>
            </section>
            <section className="card">
              <h2>记录的预算</h2>
              <p>{summary.totalBudget.toFixed(2)}</p>
            </section>
            {summary.upcoming && (
              <section className="card">
                <h2>最近行程</h2>
                <p>{summary.upcoming.name}</p>
                <small>
                  {summary.upcoming.preference.startDate} → {summary.upcoming.preference.endDate}
                </small>
              </section>
            )}
          </div>
          <section className="card">
            <div className="section-header">
              <h2>行程快速查看</h2>
              <Link className="link" to="/plans">查看更多</Link>
            </div>
            {!previewPlans.length && <p>暂无行程。</p>}
            {previewPlans.map((plan) => (
              <div key={plan.id} className="dashboard-plan-row">
                <div>
                  <strong>{plan.name}</strong>
                  <p>
                    {plan.preference.startDate} → {plan.preference.endDate}
                  </p>
                </div>
                <Link className="link" to={`/plans/${plan.id}`}>详情</Link>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
