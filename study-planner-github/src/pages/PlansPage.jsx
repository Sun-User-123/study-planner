import { useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, ListPlus, ListTodo } from 'lucide-react';
import BatchAddModal from '../components/BatchAddModal.jsx';
import PlanCard from '../components/PlanCard.jsx';
import PlanEditorModal from '../components/PlanEditorModal.jsx';
import { Button, EmptyState, Segmented } from '../components/UI.jsx';
import { useData } from '../store.jsx';
import {
  addDays,
  formatDateLabel,
  formatPeriodLabel,
  periodFromKey,
  periodRange,
  shiftPeriod,
  toPeriodKey,
  todayKey,
} from '../utils/date.js';

const periodOptions = [
  { value: 'day', label: '每日' },
  { value: 'week', label: '每周' },
  { value: 'month', label: '每月' },
];

export default function PlansPage() {
  const { plans, subjects, loading, setPlanStatus, deletePlan, updatePlan } = useData();
  const [periodType, setPeriodType] = useState('day');
  const [period, setPeriod] = useState(todayKey());
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [batchOpen, setBatchOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPlan, setEditorPlan] = useState(null);

  const { start, end } = useMemo(() => periodRange(period, periodType), [period, periodType]);

  const visiblePlans = useMemo(() => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return plans
      .filter((plan) => {
        const date = periodFromKey(plan.period, plan.period_type);
        if (date.getTime() < startMs || date.getTime() > endMs) return false;
        if (subjectFilter === 'unassigned') return !plan.subject_id;
        if (subjectFilter !== 'all') return plan.subject_id === subjectFilter;
        return true;
      })
      .sort((a, b) => {
        const diff = periodFromKey(a.period, a.period_type) - periodFromKey(b.period, b.period_type);
        return diff || (a.sort_order || 0) - (b.sort_order || 0);
      });
  }, [plans, start, end, subjectFilter]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const plan of visiblePlans) {
      const key = periodFromKey(plan.period, plan.period_type);
      const dateKey = toPeriodKey(key, periodType);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(plan);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visiblePlans, periodType]);

  function changePeriodType(nextType) {
    setPeriodType(nextType);
    setPeriod(toPeriodKey(new Date(), nextType));
  }

  return (
    <div className="page plans-page">
      <section className="page-heading plans-heading">
        <div>
          <p className="eyebrow">计划管理</p>
          <h1>{periodType === 'day' ? '每日计划' : periodType === 'week' ? '每周计划' : '每月计划'}</h1>
          <p className="subtitle">{formatPeriodLabel(period, periodType)}</p>
        </div>
        <div className="heading-actions">
          <Button variant="secondary" onClick={() => setBatchOpen(true)} icon={CalendarPlus}>
            批量添加
          </Button>
          <Button onClick={() => setEditorOpen(true)} icon={ListPlus}>
            添加
          </Button>
        </div>
      </section>

      <section className="plans-toolbar">
        <Segmented options={periodOptions} value={periodType} onChange={changePeriodType} />
        <div className="period-nav">
          <Button variant="ghost" size="icon" onClick={() => setPeriod((p) => shiftPeriod(p, periodType, -1))} aria-label="上一周期">
            <ChevronLeft size={18} />
          </Button>
          <button className="period-label" onClick={() => setPeriod(toPeriodKey(new Date(), periodType))}>
            {formatPeriodLabel(period, periodType)}
          </button>
          <Button variant="ghost" size="icon" onClick={() => setPeriod((p) => shiftPeriod(p, periodType, 1))} aria-label="下一周期">
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="subject-filters">
          <button className={subjectFilter === 'all' ? 'chip active' : 'chip'} onClick={() => setSubjectFilter('all')}>
            全部
          </button>
          {subjects.map((subject) => (
            <button
              key={subject.id}
              className={subjectFilter === subject.id ? 'chip active' : 'chip'}
              style={subjectFilter === subject.id ? { borderColor: subject.color, color: subject.color } : undefined}
              onClick={() => setSubjectFilter(subject.id)}
            >
              <i style={{ backgroundColor: subject.color }} />
              {subject.name}
            </button>
          ))}
          <button
            className={subjectFilter === 'unassigned' ? 'chip active' : 'chip'}
            onClick={() => setSubjectFilter('unassigned')}
          >
            未分类
          </button>
        </div>
      </section>

      {loading ? (
        <div className="skeleton card tall" />
      ) : groups.length ? (
        groups.map(([dateKey, groupPlans]) => {
          const date = periodFromKey(dateKey, periodType);
          const isToday = dateKey === todayKey();
          return (
            <section className="plan-group" key={dateKey}>
              <div className="group-heading">
                <div>
                  <h2>{formatDateLabel(date)}</h2>
                  <p>
                    {groupPlans.filter((p) => p.status === 'done').length}/{groupPlans.length} 已完成
                  </p>
                </div>
                {isToday ? <span className="today-pill">今天</span> : null}
              </div>
              <div className="plan-list">
                {groupPlans.map((plan) => (
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
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <EmptyState
          icon={ListTodo}
          title="这个周期还没有计划"
          description="可以用批量添加一次录入一整周的任务"
          action={
            <div className="empty-actions">
              <Button onClick={() => setBatchOpen(true)}>批量添加</Button>
              <Button variant="secondary" onClick={() => setEditorOpen(true)}>
                单独添加
              </Button>
            </div>
          }
        />
      )}

      {batchOpen ? (
        <BatchAddModal
          context={{ periodType, period, subjectId: subjectFilter !== 'all' && subjectFilter !== 'unassigned' ? subjectFilter : null }}
          onClose={() => setBatchOpen(false)}
        />
      ) : null}

      {editorOpen ? (
        <PlanEditorModal
          plan={editorPlan}
          context={{ periodType, period, subjectId: subjectFilter !== 'all' && subjectFilter !== 'unassigned' ? subjectFilter : null }}
          onClose={() => {
            setEditorOpen(false);
            setEditorPlan(null);
          }}
        />
      ) : null}
    </div>
  );
}
