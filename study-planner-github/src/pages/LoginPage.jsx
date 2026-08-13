import { useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardList, Clock3, Sparkles } from 'lucide-react';
import { authApi } from '../api.js';
import { Button } from '../components/UI.jsx';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = mode === 'register' ? { username, password, nickname } : { username, password };
      const result = await (mode === 'register' ? authApi.register(payload) : authApi.login(payload));
      onLogin(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="hero-inner">
          <div className="hero-brand">
            <div className="brand-mark large">
              <ClipboardList size={30} />
            </div>
            <div>
              <h1>学习计划</h1>
              <p>Study Planner</p>
            </div>
          </div>
          <div className="hero-points">
            <div className="hero-point">
              <BookOpen size={22} />
              <span>把目标拆成每天的行动</span>
            </div>
            <div className="hero-point">
              <Clock3 size={22} />
              <span>任务再多，也有条理</span>
            </div>
            <div className="hero-point">
              <CheckCircle2 size={22} />
              <span>坚持每天都算数</span>
            </div>
            <div className="hero-point">
              <Sparkles size={22} />
              <span>每天前进一小步</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              登录
            </button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
              注册
            </button>
          </div>

          <div className="auth-fields">
            {mode === 'register' ? (
              <label className="auth-field">
                <span>昵称</span>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="给自己起个名字"
                  maxLength={20}
                />
              </label>
            ) : null}
            <label className="auth-field">
              <span>用户名</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="2-20 位字母、数字、下划线或中文"
                autoComplete="username"
              />
            </label>
            <label className="auth-field">
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <Button type="submit" disabled={submitting} className="auth-submit" size="lg">
            {submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'}
          </Button>
        </form>
      </section>
    </div>
  );
}
