import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Palette,
  Settings,
} from 'lucide-react';
import { NavLink, Route, Routes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage.jsx';
import PlansPage from '../pages/PlansPage.jsx';
import CalendarPage from '../pages/CalendarPage.jsx';
import StatsPage from '../pages/StatsPage.jsx';
import SubjectsPage from '../pages/SubjectsPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';

const navItems = [
  { to: '/', label: '今日', icon: LayoutDashboard },
  { to: '/plans', label: '计划', icon: ListTodo },
  { to: '/calendar', label: '日历', icon: CalendarDays },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/subjects', label: '科目', icon: Palette },
  { to: '/settings', label: '设置', icon: Settings },
];

export default function Layout({ user, onLogout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ClipboardList size={24} />
          </div>
          <div className="brand-text">
            <strong>学习计划</strong>
            <span>Study Planner</span>
          </div>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="side-link">
              <item.icon size={19} strokeWidth={2.1} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user.nickname?.slice(0, 1).toUpperCase() || user.username.slice(0, 1).toUpperCase()}</div>
          <div className="user-meta">
            <strong>{user.nickname || user.username}</strong>
            <span>@ {user.username}</span>
          </div>
          <button className="icon-btn ghost" onClick={onLogout} title="退出登录" aria-label="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <div className="brand compact">
          <div className="brand-mark small">
            <ClipboardList size={19} />
          </div>
          <strong>学习计划</strong>
        </div>
        <button className="icon-btn ghost" onClick={onLogout} title="退出登录" aria-label="退出登录">
          <LogOut size={18} />
        </button>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/settings" element={<SettingsPage user={user} onLogout={onLogout} />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="bottom-link">
            <item.icon size={20} strokeWidth={2.1} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
