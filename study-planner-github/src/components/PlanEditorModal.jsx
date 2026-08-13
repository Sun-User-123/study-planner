import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useData } from '../store.jsx';
import { toPeriodKey } from '../utils/date.js';
import { Button, Field, Modal } from './UI.jsx';

const emptyPlan = {
  content: '',
  subjectId: '',
  periodType: 'day',
  period: toPeriodKey(new Date(), 'day'),
  durationMinutes: null,
  priority: 'medium',
  status: 'todo',
  notes: '',
};

export default function PlanEditorModal({ plan, context, onClose }) {
  const { subjects, addPlans, updatePlan } = useData();
  const [form, setForm] = useState({
    ...emptyPlan,
    ...(plan || {}),
    subjectId: plan?.subject_id || context.subjectId || '',
    period: plan?.period || context.period || toPeriodKey(new Date(), context.periodType || 'day'),
    periodType: plan?.period_type || context.periodType || 'day',
  });
  const [durationText, setDurationText] = useState(
    plan?.duration_minutes ? `${plan.duration_minutes}分钟` : '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (form.periodType === 'month' && form.period?.length === 10) {
      setForm((prev) => ({ ...prev, period: prev.period.slice(0, 7) }));
    }
  }, [form.periodType, form.period]);

  function setField(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handlePeriodChange(value) {
    if (form.periodType === 'month') {
      setField({ period: value.slice(0, 7) });
    } else if (form.periodType === 'week') {
      setField({ period: toPeriodKey(new Date(`${value}T00:00:00`), 'week') });
    } else {
      setField({ period: value });
    }
  }

  async function handleSubmit() {
    if (!form.content.trim()) {
      setError('任务内容不能为空');
      return;
    }
    setSubmitting(true);
    setError('');
    const match = durationText.match(/(\d+(?:\.\d+)?)\s*(小时|h|时|分钟|min|分)?/i);
    let minutes = form.durationMinutes;
    if (match) {
      minutes = match[2] && /小时|h|时/i.test(match[2]) ? Math.round(Number(match[1]) * 60) : Math.round(Number(match[1]));
    }
    const payload = {
      content: form.content.trim(),
      subjectId: form.subjectId ? Number(form.subjectId) : null,
      periodType: form.periodType,
      period: form.period,
      durationMinutes: minutes,
      priority: form.priority,
      status: form.status,
      notes: form.notes,
    };
    try {
      if (plan) await updatePlan(plan.id, payload);
      else await addPlans([payload]);
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={plan ? '编辑计划' : '添加计划'}
      onClose={onClose}
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} icon={Save}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="editor-form">
        <Field label="任务内容">
          <textarea
            rows={2}
            value={form.content}
            onChange={(e) => setField({ content: e.target.value })}
            placeholder="例如：数学第一章习题"
          />
        </Field>

        <div className="form-grid two">
          <Field label="科目">
            <select value={form.subjectId} onChange={(e) => setField({ subjectId: e.target.value })}>
              <option value="">未分类</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="预计时长">
            <input value={durationText} onChange={(e) => setDurationText(e.target.value)} placeholder="如 120分钟" />
          </Field>
        </div>

        <div className="form-grid three">
          <Field label="周期">
            <select value={form.periodType} onChange={(e) => setField({ periodType: e.target.value })}>
              <option value="day">每日</option>
              <option value="week">每周</option>
              <option value="month">每月</option>
            </select>
          </Field>
          <Field label={form.periodType === 'month' ? '月份' : form.periodType === 'week' ? '周起始日' : '日期'}>
            <input
              type={form.periodType === 'month' ? 'month' : 'date'}
              value={form.period.slice(0, form.periodType === 'month' ? 7 : 10)}
              onChange={(e) => handlePeriodChange(e.target.value)}
            />
          </Field>
          <Field label="优先级">
            <select value={form.priority} onChange={(e) => setField({ priority: e.target.value })}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </Field>
        </div>

        <Field label="状态">
          <select value={form.status} onChange={(e) => setField({ status: e.target.value })}>
            <option value="todo">未完成</option>
            <option value="doing">进行中</option>
            <option value="done">已完成</option>
          </select>
        </Field>

        <Field label="备注" hint="备注里可以放 B 站视频链接，点击计划可一键打开">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setField({ notes: e.target.value })}
            placeholder="错题整理、视频链接、章节页码…"
          />
        </Field>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
