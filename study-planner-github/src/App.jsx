import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { HashRouter } from 'react-router-dom';
import { authApi, clearSession, setToken } from './api.js';
import { DataProvider } from './store.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Layout from './components/Layout.jsx';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('planner_user') || 'null');
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(readStoredUser);
  const [bootstrapping, setBootstrapping] = useState(Boolean(readStoredUser()));

  useEffect(() => {
    if (!user) return;
    authApi
      .me()
      .then((result) => {
        setUser(result.user);
        localStorage.setItem('planner_user', JSON.stringify(result.user));
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setBootstrapping(false));
  }, []);

  function handleLogin(result) {
    setToken(result.token);
    localStorage.setItem('planner_user', JSON.stringify(result.user));
    setUser(result.user);
    setBootstrapping(false);
  }

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (bootstrapping) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">
          <ClipboardList size={30} />
        </div>
        <p>正在连接云端数据…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DataProvider user={user}>
      <HashRouter>
        <Layout user={user} onLogout={handleLogout} />
      </HashRouter>
    </DataProvider>
  );
}
