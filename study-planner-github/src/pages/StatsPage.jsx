import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, ListTodo, PieChart, Target } from 'lucide-react';
import { EmptyState, Segmented } from '../components/UI.jsx';
import { useData } from '../store.jsx';
import { addDays, periodFromKey, startOfWeek, toDateKey } from '../utils/date.js';
import { formatDuration } from '../utils/parser.js';

const ranges = [
  { value: 'all', label: '全部' },
  { value: '30d', label: '近 30 天' },
  { value: '7d', label: '近 7 天' },
];

export default function StatsPage() {
  const { plans, subjects } = useData();
  const [range, setRange] = useState('all');

  const stats = useMemo(() => {
    const cutoff =
      range === '7d' ? addDays(new Date(), -6) : range === '30d' ? addDays(new Date(), -29) : null;
    const filtered = cutoff ? plans.filter((p) => periodFromKey(p.period, p.period_type) >= cutoff) : plans;
    const done = filtered.filter((p) => p.status === 'done');
    const doing = filtered.filter((p) => p.status === 'doing');
    const doneMinutes = done.reduce((sum, p) => sum + (p.duration_minutes || 0), 0);
    const plannedMinutes = filtered.reduce((sum, p) => sum + (p.duration_minutes || 0), 0);

    const weekStart = startOfWeek(new Date());
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const key = toDateKey(date);
      const dayPlans = filtered.filter((p) => p.period_type === 'day' && p.period === key);
      return {
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        total: dayPlans.length,
        done: dayPlans.filter((p) => p.status === 'done').length,
        minutes: dayPlans.filter((p) => p.status === 'done').reduce((sum, p) => sum + (p.duration_minutes || 0), 0),
      };
    });

    const bySubject = subjects
      .map((subject) => {
        const subjectPlans = filtered.filter((p) => p.subject_id === subject.id);
        const subjectDone = subjectPlans.filter((p) => p.status === 'done');
        return {
          ...subject,
          total: subjectPlans.length,
          done: subjectDone.length,
          rate: subjectPlans.length ? subjectDone.length / subjectPlans.length : 0,
          minutes: subjectDone.reduce((sum, p) => sum + (p.duration_minutes || 0), 0),
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const unassigned = filtered.filter((p) => !p.subject_id);
    const unassignedDone = unassigned.filter((p) => p.status === 'done');
    if (unassigned.length) {
      bySubject.push({
        id: 0,
        name: '未分类',
        color: '#8b93a7',
        total: unassigned.length,
        done: unassignedDone.length,
        rate: unassignedDone.length / unassigned.length,
        minutes: unassignedDone.reduce((sum, p) => sum + (p.duration_minutes || 0), 0),
      });
    }

    const maxDay = Math.max(...last7.map((d) => d.total), 1);
    return {
      total: filtered.length,
      done: done.length,
      doing: doing.length,
      rate: filtered.length ? done.length / filtered.length : 0,
      doneMinutes,
      plannedMinutes,
      last7,
      maxDay,
      bySubject,
      maxSubject: Math.max(...bySubject.map((s) => s.total), 1),
    };
  }, [plans, subjects, range]);

  if (!plans.length) {
    return (
      <div className="page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">学习统计</p>
            <h1>数据会越攒越多</h1>
            <p className="subtitle">添加计划后，这里会出现完成率和时长趋势</p>
          </div>
        </section>
        <EmptyState icon={BarChart3} title="还没有可统计的数据" description="先去计划页添加几条任务吧" />
      </div>
    );
  }

  return (
    <div className="page stats-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">学习统计</p>
          <h1>把进度变成看得见的数字</h1>
          <p className="subtitle">统计范围会影响下方全部数据</p>
        </div>
        <Segmented options={ranges} value={range} onChange={setRange} />
      </section>

      <section className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon indigo">
            <ListTodo size={20} />
          </div>
          <span className="stat-label">计划总数</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 size={20} />
          </div>
          <span className="stat-label">已完成</span>
          <strong>{stats.done}</strong>
          <span className="stat-sub">进行中 {stats.doing}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Target size={20} />
          </div>
          <span className="stat-label">完成率</span>
          <strong>{Math.round(stats.rate * 100)}%</strong>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Clock3 size={20} />
          </div>
          <span className="stat-label">已投入时长</span>
          <strong>{formatDuration(stats.doneMinutes) || '0分钟'}</strong>
        </div>
      </section>

      <div className="stats-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>本周趋势</h2>
              <p>每日任务完成数</p>
            </div>
          </div>
          <div className="week-chart">
            {stats.last7.map((day, index) => (
              <div className="week-chart-col" key={index}>
                <div className="chart-track">
                  <div
                    className="chart-bar"
                    style={{ height: `${Math.max((day.total / stats.maxDay) * 100, day.total ? 10 : 3)}%` }}
                  >
                    {day.done ? <span className="chart-done-mark" /> : null}
                  </div>
                </div>
                <span className={index === 6 ? 'today' : ''}>{day.label}</span>
                <small>{day.done}/{day.total}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>科目分布</h2>
              <p>各科计划量与完成率</p>
            </div>
          </div>
          <div className="subject-bars">
            {stats.bySubject.map((item) => (
              <div className="subject-bar-row" key={item.id}>
                <div className="subject-bar-meta">
                  <span className="subject-dot" style={{ backgroundColor: item.color }} />
                  <strong>{item.name}</strong>
                  <small>{item.done}/{item.total} · {Math.round(item.rate * 100)}%</small>
                </div>
                <div className="subject-bar-track">
                  <div
                    className="subject-bar-fill"
                    style={{ width: `${(item.total / stats.maxSubject) * 100}%`, backgroundColor: item.color }}
                  >
                    <i style={{ width: `${item.rate * 100}%` }} />
                  </div>
                </div>
                <span>{formatDuration(item.minutes) || '0分钟'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>总览</h2>
            <p>计划投入与完成情况</p>
          </div>
        </div>
        <div className="overview-row">
          <div className="overview-item">
            <PieChart size={18} />
            <div>
              <span>计划总时长</span>
              <strong>{formatDuration(stats.plannedMinutes) || '0分钟'}</strong>
            </div>
          </div>
          <div className="overview-item">
            <CheckCircle2 size={18} />
            <div>
              <span>已完成时长</span>
              <strong>{formatDuration(stats.doneMinutes) || '0分钟'}</strong>
            </div>
          </div>
          <div className="overview-item">
            <Target size={18} />
            <div>
              <span>完成率</span>
              <strong>{Math.round(stats.rate * 100)}%</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
