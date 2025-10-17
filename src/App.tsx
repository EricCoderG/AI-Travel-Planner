import { useEffect } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import PlansListPage from './pages/PlansListPage';
import PlanDetailPage from './pages/PlanDetailPage';
import BudgetPage from './pages/BudgetPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { usePlannerStore } from './store/usePlannerStore';

const App = () => {
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrateFromSupabase);
  const loadPlans = usePlannerStore((state) => state.loadInitialData);
  const location = useLocation();

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  useEffect(() => {
    hydrateAuth().catch((error) => console.error(error));
  }, [hydrateAuth]);

  useEffect(() => {
    loadPlans().catch((error) => console.error(error));
  }, [loadPlans, user]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="logo">AI 旅行助手</h1>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            首页概览
          </NavLink>
          <NavLink to="/planner" className={({ isActive }) => (isActive ? 'active' : '')}>
            智能规划
          </NavLink>
          <NavLink to="/plans" className={({ isActive }) => (isActive ? 'active' : '')}>
            行程列表
          </NavLink>
          <NavLink to="/budget" className={({ isActive }) => (isActive ? 'active' : '')}>
            预算管理
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            设置
          </NavLink>
          <NavLink to="/auth" className={({ isActive }) => (isActive ? 'active' : '')}>
            {user ? '账号信息' : '登录 / 注册'}
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes location={location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/plans" element={<PlansListPage />} />
          <Route path="/plans/:planId" element={<PlanDetailPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
