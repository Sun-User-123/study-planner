import { useMemo, useState } from 'react';
import { CalendarCheck2, ChevronRight, Flame, ListPlus, Timer, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanCard from '../components/PlanCard.jsx';
import PlanEditorModal from '../components/PlanEditorModal.jsx';
import { Button, EmptyState, ProgressRing } from '../components/UI.jsx';
import { useData } from '../store.jsx';
import { addDays, formatDateLabel, periodFromKey, startOfWeek, toDateKey, toPeriodKey, todayKey } from '../utils/date.js';
import { formatDuration } from '../utils/parser.js';

function inRange(plan, start, end) {
  const date = periodFromKey(plan.period, plan.period_type);
  return date >= start && date <= end;
}

export default function DashboardPage() {
  const { plans, subjects, loading, setPlanStatus, deletePlan, updatePlan, addPlans } = useData();
  const [quickContent, setQuickContent] = useState('');
  const [quickSubject, setQuickSubject] = useState('');
  const [editorPlan, setEditorPlan] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const today = todayKey();

  const stats = useMemo(() => {
    const todayPlans = plans.filter((p) => p.period_type === 'day' && p.period === today);
    const todayDone = todayPlans.filter((p) => p.status === 'done');
    const weekStart = startOfWeek(new Date());
    const weekEnd = addDays(weekStart, 6);
    const weekPlans = plans.filter((p) => inRange(p, weekStart, weekEnd));
    const weekDone = weekPlans.filter((p) => p.status === 'done');
    const donePlans = plans.filter((p) => p.status === 'done');
    const doneMinutes = donePlans.reduce((sum, p) => sum + (p.duration_minutes || 0), 0);

    const doneDays = new Set(
      plans.filter((p) => p.period_type === 'day' && p.status === 'done').map((p) => p.period),
    );
    let streak = 0;
    let cursor = new Date();
    if (!doneDays.has(toDateKey(cursor))) cursor = addDays(cursor, -1);
    while (doneDays.has(toDateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(new Date(), i - 6);
      const key = toDateKey(date);
      const dayPlans = plans.filter((p) => p.period_type === 'day' && p.period === key);
      return {
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        done: dayPlans.filter((p) => p.status === 'done').length,
        total: dayPlans.length,
      };
    });

    return {
      todayPlans,
      todayDone,
      todayRate: todayPlans.length ? todayDone.length / todayPlans.length : 0,
      weekRate: weekPlans.length ? weekDone.length / weekPlans.length : 0,
      doneMinutes,
      streak,
      last7,
    };
  }, [plans, today]);

  async function handleQuickAdd(event) {
    event.preventDefault();
    const content = quickContent.trim();
    if (!content) return;
    await addPlans([
      {
        content,
        subjectId: quickSubject ? Number(quickSubject) : null,
        periodType: 'day',
        period: today,
        durationMinutes: null,
        priority: 'medium',
        status: 'todo',
        notes: '',
      },
    ]);
    setQuickContent('');
  }

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton hero" />
        <div className="skeleton-grid">
          <div className="skeleton card" />
          <div className="skeleton card" />
          <div className="skeleton card" />
          <div className="skeleton card" />
        </div>
        <div className="skeleton card tall" />
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <section className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">{formatDateLabel(new Date())}</p>
          <h1>今天也要稳稳推进</h1>
          <p className="subtitle">今日 {stats.todayDone.length}/{stats.todayPlans.length} 条计划已完成</p>
        </div>
        <Link to="/plans" className="text-link">
          查看全部计划
          <ChevronRight size={16} />
        </Link>
      </section>

      <section className="stat-grid">
        <div className="stat-card primary">
          <div className="stat-copy">
            <span className="stat-label">今日完成</span>
            <strong>{stats.todayDone.length}/{stats.todayPlans.length}</strong>
            <span className="stat-sub">条计划</span>
          </div>
          <ProgressRing value={stats.todayRate} color="#6366f1" size={76} stroke={8} />
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <CalendarCheck2 size={20} />
          </div>
          <span className="stat-label">本周完成率</span>
          <strong>{Math.round(stats.weekRate * 100)}%</strong>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Timer size={20} />
          </div>
          <span className="stat-label">累计学习</span>
          <strong>{formatDuration(stats.doneMinutes) || '0分钟'}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Flame size={20} />
          </div>
          <span className="stat-label">连续打卡</span>
          <strong>{stats.streak} 天</strong>
        </div>
      </section>

      <form className="quick-add" onSubmit={handleQuickAdd}>
        <div className="quick-add-icon">
          <ListPlus size={19} />
        </div>
        <input
          value={quickContent}
          onChange={(e) => setQuickContent(e.target.value)}
          placeholder="快速记一条今天的任务"
        />
        <select value={quickSubject} onChange={(e) => setQuickSubject(e.target.value)}>
          <option value="">未分类</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={!quickContent.trim()}>
          添加
        </Button>
      </form>

      <section className="content-grid">
        <div className="today-panel">
          <div className="section-heading">
            <div>
              <h2>今日计划</h2>
              <p>按完成状态逐条推进</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditorOpen(true)} icon={ListPlus}>
              添加
            </Button>
          </div>
          <div className="plan-list">
            {stats.todayPlans.length ? (
              stats.todayPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onToggle={(item, status) => setPlanStatus(item.id, status)}
                  onEdit={(item) => {
                    setEditorPlan(item);
                    setEditorOpen(true);
                  }}
                  onDelete={(item) => {
                    if (window.confirm('确定删除这条计划吗？')) deletePlan(item.id);
                  }}
                />
              ))
            ) : (
              <EmptyState
                icon={Trophy}
                title="今天还没有计划"
                description="先记下第一件事，把今天交给复习"
                action={
                  <Button size="sm" onClick={() => setEditorOpen(true)}>
                    添加计划
                  </Button>
                }
              />
            )}
          </div>
        </div>

        <aside className="week-panel">
          <div className="section-heading">
            <div>
              <h2>近 7 天</h2>
              <p>每天完成的任务数</p>
            </div>
          </div>
          <div className="mini-bars">
            {stats.last7.map((day, index) => {
              const max = Math.max(...stats.last7.map((d) => d.total), 1);
              return (
                <div className="mini-bar" key={day.key}>
                  <div className="bar-track">
                    <div
                      className={day.total ? 'bar-fill' : 'bar-fill empty'}
                      style={{ height: `${Math.max((day.total / max) * 100, day.total ? 12 : 3)}%` }}
                    >
                      {day.done ? <span className="bar-done" /> : null}
                    </div>
                  </div>
                  <span className={index === 6 ? 'today' : ''}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      {editorOpen ? (
        <PlanEditorModal
          plan={editorPlan}
          context={{ periodType: 'day', period: today, subjectId: null }}
          onClose={() => {
            setEditorOpen(false);
            setEditorPlan(null);
          }}
        />
      ) : null}
    </div>
  );
}
