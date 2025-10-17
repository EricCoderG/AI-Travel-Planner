import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PlanViewer from '../components/PlanViewer';
import MapSection from '../components/MapSection';
import { usePlannerStore } from '../store/usePlannerStore';

const PlanDetailPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const { plans, setActivePlan } = usePlannerStore((state) => ({ plans: state.plans, setActivePlan: state.setActivePlan }));

  const planExists = useMemo(() => plans.some((plan) => plan.id === planId), [plans, planId]);

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
      <MapSection />
    </div>
  );
};

export default PlanDetailPage;
