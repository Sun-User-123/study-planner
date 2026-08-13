import { Check, Clock3, ExternalLink, Pencil, Play, Trash2 } from 'lucide-react';
import { detectBilibiliUrl, formatDuration, formatPriority, formatStatus } from '../utils/parser.js';
import { IconButton } from './UI.jsx';

function openExternal(url) {
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export default function PlanCard({ plan, onToggle, onEdit, onDelete }) {
  const color = plan.subject_color || '#8b93a7';
  const bilibiliUrl = detectBilibiliUrl(plan.notes);
  const done = plan.status === 'done';
  const doing = plan.status === 'doing';

  return (
    <article className={`plan-card ${done ? 'is-done' : ''} ${doing ? 'is-doing' : ''}`}>
      <button
        className={`check-btn ${done ? 'checked' : ''}`}
        onClick={() => onToggle(plan, done ? 'todo' : 'done')}
        aria-label={done ? '标记为未完成' : '标记为已完成'}
      >
        {done ? <Check size={15} strokeWidth={3} /> : null}
      </button>

      <div className="plan-main">
        <div className="plan-title-row">
          <h3>{plan.content}</h3>
          {plan.subject_name ? (
            <span className="subject-chip" style={{ backgroundColor: `${color}1a`, color }}>
              <i style={{ backgroundColor: color }} />
              {plan.subject_name}
            </span>
          ) : (
            <span className="subject-chip muted">
              <i />
              未分类
            </span>
          )}
        </div>

        <div className="plan-meta">
          {plan.duration_minutes ? (
            <span>
              <Clock3 size={13} />
              {formatDuration(plan.duration_minutes)}
            </span>
          ) : null}
          <span className={`priority priority-${plan.priority}`}>{formatPriority(plan.priority)}优先级</span>
          {plan.status === 'doing' ? <span className="doing-badge">进行中</span> : null}
          {plan.status === 'done' ? <span className="done-badge">已完成</span> : null}
          <span className="status-text">{formatStatus(plan.status)}</span>
        </div>

        {plan.notes ? (
          <div className="plan-notes">
            <p>{plan.notes}</p>
            {bilibiliUrl ? (
              <button className="bili-link" onClick={() => openExternal(bilibiliUrl)}>
                <ExternalLink size={13} />
                打开 B 站
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="plan-actions">
        <IconButton icon={Play} label="设为进行中" className="ghost" onClick={() => onToggle(plan, doing ? 'todo' : 'doing')} />
        <IconButton icon={Pencil} label="编辑" className="ghost" onClick={() => onEdit(plan)} />
        <IconButton icon={Trash2} label="删除" className="ghost danger" onClick={() => onDelete(plan)} />
      </div>
    </article>
  );
}
