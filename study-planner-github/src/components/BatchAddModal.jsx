import { useMemo, useState } from 'react';
import { FileUp, Plus, Wand2 } from 'lucide-react';
import { useData } from '../store.jsx';
import { parsePlanLines, formatDuration, formatPriority, formatStatus } from '../utils/parser.js';
import { readImportFile } from '../utils/exportImport.js';
import { toPeriodKey } from '../utils/date.js';
import { Button, Modal } from './UI.jsx';

const autoSubjectColors = ['#4F86F7', '#34A853', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6'];

export default function BatchAddModal({ context, initialText = '', onClose }) {
  const { subjects, addPlans, addSubject } = useData();
  const [text, setText] = useState(initialText);
  const [rows, setRows] = useState(() => parsePlanLines(initialText, context, subjects));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [defaultSubjectId, setDefaultSubjectId] = useState(context.subjectId || '');
  const [periodType, setPeriodType] = useState(context.periodType || 'day');
  const [periodDate, setPeriodDate] = useState(context.period?.slice(0, 10) || toPeriodKey(new Date(), 'day'));

  const effectiveContext = useMemo(
    () => ({
      periodType,
      period:
        periodType === 'month'
          ? periodDate.slice(0, 7)
          : periodType === 'week'
            ? toPeriodKey(new Date(`${periodDate}T00:00:00`), 'week')
            : periodDate,
      subjectId: defaultSubjectId || null,
    }),
    [periodType, periodDate, defaultSubjectId],
  );

  function handleTextChange(value) {
    setText(value);
    setRows(parsePlanLines(value, effectiveContext, subjects));
  }

  function handlePeriodContextChange(nextType, nextDate) {
    let value = nextDate || toPeriodKey(new Date(), nextType);
    if (nextType === 'month') value = value.slice(0, 7);
    else if (value.length === 7) value = toPeriodKey(new Date(), nextType);
    setPeriodType(nextType);
    setPeriodDate(value);
  }

  function updateRow(index, patch) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleImportFile(file) {
    try {
      const imported = await readImportFile(file);
      setText(imported);
      setRows(parsePlanLines(imported, effectiveContext, subjects));
    } catch {
      setError('文件读取失败，请确认是 txt 或 Word 文件');
    }
  }

  async function ensureMissingSubjects(validRows) {
    const existing = new Map(subjects.map((subject) => [subject.name, subject]));
    const created = new Map();
    const seen = new Set();

    for (const row of validRows) {
      const name = String(row.subjectName || '').trim();
      if (!name || row.subjectId || seen.has(name)) continue;
      seen.add(name);

      const current = existing.get(name) || created.get(name);
      if (current) continue;

      const color = autoSubjectColors[(existing.size + created.size) % autoSubjectColors.length];
      const subject = await addSubject({ name, color });
      created.set(name, subject);
    }

    return created;
  }

  async function handleSubmit() {
    const validRows = rows.filter((row) => row.content);
    if (!validRows.length) return;
    setSubmitting(true);
    setError('');
    try {
      const createdSubjects = await ensureMissingSubjects(validRows);
      const subjectByName = new Map(subjects.map((subject) => [subject.name, subject]));
      for (const subject of createdSubjects.values()) {
        subjectByName.set(subject.name, subject);
      }

      await addPlans(
        validRows.map((row) => {
          const subjectId =
            row.subjectId ||
            (row.subjectName ? subjectByName.get(row.subjectName)?.id : null) ||
            null;
          return {
          content: row.content,
          subjectId,
          periodType: row.periodType || periodType,
          period: row.period,
          durationMinutes: row.durationMinutes,
          priority: row.priority,
          status: row.status,
          notes: row.notes,
          };
        }),
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const validCount = rows.filter((row) => row.content).length;

  return (
    <Modal
      title="批量添加计划"
      subtitle={`已识别 ${validCount} 条，提交后立即同步`}
      onClose={onClose}
      width={920}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!validCount || submitting} icon={Plus}>
            {submitting ? '添加中…' : `添加 ${validCount} 条`}
          </Button>
        </>
      }
    >
      <div className="batch-toolbar">
        <label className="compact-select">
          <span>周期</span>
          <select
            value={periodType}
            onChange={(e) => handlePeriodContextChange(e.target.value, periodDate)}
          >
            <option value="day">每日</option>
            <option value="week">每周</option>
            <option value="month">每月</option>
          </select>
        </label>
        <label className="compact-select">
          <span>日期</span>
          <input
            type={periodType === 'month' ? 'month' : 'date'}
            value={periodDate.slice(0, periodType === 'month' ? 7 : 10)}
            onChange={(e) => handlePeriodContextChange(periodType, e.target.value)}
          />
        </label>
        <label className="compact-select grow">
          <span>默认科目</span>
          <select value={defaultSubjectId} onChange={(e) => setDefaultSubjectId(e.target.value)}>
            <option value="">未分类</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="file-import-btn">
          <FileUp size={15} />
          导入文件
          <input type="file" accept=".txt,.docx" onChange={(e) => handleImportFile(e.target.files[0])} />
        </label>
      </div>

      <textarea
        className="batch-textarea"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={'每行一条计划，可用 | 分隔字段，例如：\n英语阅读练习 | 英语 | 每日 | 2026-08-13 | 120分钟 | 高 | 未完成 | 错题整理'}
        rows={7}
      />

      {error ? <p className="form-error">{error}</p> : null}

      {rows.length ? (
        <div className="batch-preview">
          <div className="preview-head">
            <Wand2 size={15} />
            导入预览，可在提交前修改
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>任务内容</th>
                  <th>科目</th>
                  <th>日期</th>
                  <th>时长</th>
                  <th>优先级</th>
                  <th>状态</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        value={row.content}
                        onChange={(e) => updateRow(index, { content: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={row.subjectId || ''}
                        onChange={(e) => updateRow(index, { subjectId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">未分类</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type={row.periodType === 'month' ? 'month' : row.periodType === 'week' ? 'date' : 'date'}
                        value={row.period}
                        onChange={(e) =>
                          updateRow(index, {
                            period: e.target.value,
                            periodType:
                              e.target.value.length === 7 ? 'month' : row.periodType === 'week' ? 'week' : 'day',
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.durationMinutes ? formatDuration(row.durationMinutes) : ''}
                        placeholder="如 120分钟"
                        onChange={(e) => {
                          const match = e.target.value.match(/\d+/);
                          updateRow(index, {
                            durationMinutes: match ? Number(match[0]) * (e.target.value.includes('小时') ? 60 : 1) : null,
                          });
                        }}
                      />
                    </td>
                    <td>
                      <select value={row.priority} onChange={(e) => updateRow(index, { priority: e.target.value })}>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </td>
                    <td>
                      <select value={row.status} onChange={(e) => updateRow(index, { status: e.target.value })}>
                        <option value="todo">未完成</option>
                        <option value="doing">进行中</option>
                        <option value="done">已完成</option>
                      </select>
                    </td>
                    <td>
                      <input value={row.notes} onChange={(e) => updateRow(index, { notes: e.target.value })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
