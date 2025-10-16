import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const AuthPage = () => {
  const { signIn, signUp, authLoading, error, user, signOut } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'login') {
      await signIn(form.email, form.password);
    } else {
      await signUp(form.email, form.password, form.displayName);
    }
  };

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        {user ? (
          <>
            <h1>已登录</h1>
            <p>{user.email}</p>
            <button className="primary" onClick={signOut} disabled={authLoading}>
              退出登录
            </button>
          </>
        ) : (
          <>
            <h1>{mode === 'login' ? '登录账户' : '注册新账户'}</h1>
            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <label>
                  昵称
                  <input
                    value={form.displayName}
                    onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  />
                </label>
              )}
              <label>
                邮箱
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="primary" disabled={authLoading}>
                {authLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
              </button>
            </form>
            <button className="link" onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}>
              {mode === 'login' ? '没有账号？注册一个' : '已有账号？直接登录'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
