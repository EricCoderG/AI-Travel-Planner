import { Link } from 'react-router-dom';
import { usePlannerStore } from '../store/usePlannerStore';

const PlansListPage = () => {
  const { plans } = usePlannerStore((state) => ({ plans: state.plans }));

  return (
    <div className="page">
      <h1>旅行计划列表</h1>
      {!plans.length && <p>当前没有行程，前往“智能规划”页创建一个新行程。</p>}
      {!!plans.length && (
        <div className="card">
          <div className="plans-table-head">
            <span>行程名称</span>
            <span>日期</span>
            <span>预算</span>
            <span>操作</span>
          </div>
          {plans.map((plan) => (
            <div key={plan.id} className="plans-table-row">
              <span>{plan.name}</span>
              <span>
                {plan.preference.startDate} → {plan.preference.endDate}
              </span>
              <span>
                {plan.estimatedBudget.toLocaleString()} {plan.currency}
              </span>
              <span>
                <Link className="link" to={`/plans/${plan.id}`}>
                  查看详情
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlansListPage;
