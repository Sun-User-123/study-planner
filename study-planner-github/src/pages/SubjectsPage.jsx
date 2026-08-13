import { useState } from 'react';
import { Check, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton } from '../components/UI.jsx';
import { useData } from '../store.jsx';

const presetColors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ef4444', '#3b82f6', '#84cc16'];

export default function SubjectsPage() {
  const { subjects, plans, addSubject, updateSubject, deleteSubject } = useData();
  const [name, setName] = useState('');
  const [color, setColor] = useState(presetColors[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState('');

  function handleAdd(event) {
    event.preventDefault();
    if (!name.trim()) return;
    addSubject({ name: name.trim(), color })
      .then(() => {
        setName('');
        setColor(presetColors[0]);
        setError('');
      })
      .catch((err) => setError(err.message));
  }

  function startEdit(subject) {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.color);
  }

  function handleSave(subject) {
    updateSubject(subject.id, { name: editName.trim() || subject.name, color: editColor })
      .then(() => {
        setEditingId(null);
        setError('');
      })
      .catch((err) => setError(err.message));
  }

  function handleDelete(subject) {
    const count = plans.filter((p) => p.subject_id === subject.id).length;
    const message = count
      ? `删除“${subject.name}”后，它的 ${count} 条计划会变成未分类，确定删除吗？`
      : `确定删除科目“${subject.name}”吗？`;
    if (window.confirm(message)) deleteSubject(subject.id);
  }

  return (
    <div className="page subjects-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">科目管理</p>
          <h1>让每一科都有自己的颜色</h1>
          <p className="subtitle">科目会以专属颜色出现在计划、日历和统计中</p>
        </div>
      </section>

      <form className="subject-add-card" onSubmit={handleAdd}>
        <div className="subject-add-title">
          <span className="color-preview" style={{ backgroundColor: color }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="新科目名称" maxLength={30} />
        </div>
        <div className="color-palette">
          {presetColors.map((preset) => (
            <button
              key={preset}
              type="button"
              className={preset === color ? 'color-swatch active' : 'color-swatch'}
              style={{ backgroundColor: preset }}
              onClick={() => setColor(preset)}
              aria-label={`选择颜色 ${preset}`}
            >
              {preset === color ? <Check size={14} strokeWidth={3} /> : null}
            </button>
          ))}
          <input
            type="color"
            className="color-input"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="自定义颜色"
          />
        </div>
        <Button type="submit" disabled={!name.trim()} icon={Plus}>
          添加科目
        </Button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      {subjects.length ? (
        <section className="subject-grid">
          {subjects.map((subject) => {
            const count = plans.filter((p) => p.subject_id === subject.id).length;
            const done = plans.filter((p) => p.subject_id === subject.id && p.status === 'done').length;
            const editing = editingId === subject.id;
            return (
              <article className="subject-card" key={subject.id}>
                <div className="subject-card-top">
                  <div className="subject-card-title">
                    <span className="subject-swatch" style={{ backgroundColor: subject.color }} />
                    {editing ? (
                      <input
                        className="inline-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={30}
                      />
                    ) : (
                      <h2>{subject.name}</h2>
                    )}
                  </div>
                  {editing ? (
                    <div className="subject-card-actions">
                      <IconButton icon={Save} label="保存" onClick={() => handleSave(subject)} />
                      <IconButton icon={Check} label="取消" className="ghost" onClick={() => setEditingId(null)} />
                    </div>
                  ) : (
                    <div className="subject-card-actions">
                      <IconButton icon={Pencil} label="编辑" className="ghost" onClick={() => startEdit(subject)} />
                      <IconButton icon={Trash2} label="删除" className="ghost danger" onClick={() => handleDelete(subject)} />
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="subject-edit-colors">
                    {presetColors.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={preset === editColor ? 'color-swatch active' : 'color-swatch'}
                        style={{ backgroundColor: preset }}
                        onClick={() => setEditColor(preset)}
                      />
                    ))}
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="color-input"
                    />
                  </div>
                ) : (
                  <div className="subject-metrics">
                    <div>
                      <strong>{count}</strong>
                      <span>条计划</span>
                    </div>
                    <div>
                      <strong>{done}</strong>
                      <span>已完成</span>
                    </div>
                    <div>
                      <strong>{count ? Math.round((done / count) * 100) : 0}%</strong>
                      <span>完成率</span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState icon={Plus} title="还没有科目" description="添加第一个科目后即可开始规划" />
      )}
    </div>
  );
}
