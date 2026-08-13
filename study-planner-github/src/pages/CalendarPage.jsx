import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PlanCard from '../components/PlanCard.jsx';
import PlanEditorModal from '../components/PlanEditorModal.jsx';
import { Button, EmptyState } from '../components/UI.jsx';
import { useData } from '../store.jsx';
import { addDays, addMonths, periodFromKey, toDateKey, todayKey } from '../utils/date.js';

export default function CalendarPage() {
  const { plans, setPlanStatus, deletePlan } = useData();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(todayKey());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPlan, setEditorPlan] = useState(null);

  const cells = useMemo(() => {
    const firstDay = cursor.getDay();
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const startOffset = firstDay === 0 ? -6 : 1 - firstDay;
    return Array.from({ length: 42 }, (_, i) => addDays(cursor, startOffset + i));
  }, [cursor]);

  const planMap = useMemo(() => {
    const map = new Map();
    for (const plan of plans) {
      const date = periodFromKey(plan.period, plan.period_type);
      const key = toDateKey(date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(plan);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [plans]);

  const selectedPlans = planMap.get(selected) || [];
  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="page calendar-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">日历视图</p>
          <h1>{cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月</h1>
          <p className="subtitle">点击日期查看当天任务</p>
        </div>
        <div className="period-nav">
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="上个月">
            <ChevronLeft size={18} />
          </Button>
          <button className="period-label" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            回到本月
          </button>
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="下个月">
            <ChevronRight size={18} />
          </Button>
        </div>
      </section>

      <section className="calendar-card">
        <div className="calendar-weekdays">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <span key={day}>周{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((date) => {
            const key = toDateKey(date);
            const dayPlans = planMap.get(key) || [];
            const done = dayPlans.filter((p) => p.status === 'done').length;
            const inMonth = date.getMonth() === cursor.getMonth();
            const isToday = key === todayKey();
            const isSelected = key === selected;
            return (
              <button
                key={key}
                className={`calendar-cell ${inMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelected(key)}
              >
                <span className="cell-date">{date.getDate()}</span>
                {dayPlans.length ? (
                  <>
                    <span className="cell-count">{done}/{dayPlans.length}</span>
                    <span className="cell-dots">
                      {[...new Set(dayPlans.map((p) => p.subject_color).filter(Boolean))].slice(0, 3).map((color, i) => (
                        <i key={i} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="day-detail">
        <div className="section-heading">
          <div>
            <h2>{selected}</h2>
            <p>{selectedPlans.length} 条计划</p>
          </div>
        </div>
        {selectedPlans.length ? (
          <div className="plan-list">
            {selectedPlans.map((plan) => (
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
        ) : (
          <EmptyState icon={CalendarDays} title={`${selected} 没有计划`} />
        )}
      </section>

      {editorOpen ? (
        <PlanEditorModal
          plan={editorPlan}
          context={{ periodType: 'day', period: selected, subjectId: null }}
          onClose={() => {
            setEditorOpen(false);
            setEditorPlan(null);
          }}
        />
      ) : null}
    </div>
  );
}
