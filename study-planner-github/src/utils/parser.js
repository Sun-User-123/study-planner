import { parseChineseDate, todayKey } from './date.js';

const priorityMap = {
  高: 'high',
  中: 'medium',
  低: 'low',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

const statusMap = {
  已完成: 'done',
  完成: 'done',
  未完成: 'todo',
  待办: 'todo',
  进行中: 'doing',
  做完了: 'done',
  做完: 'done',
  done: 'done',
  todo: 'todo',
  doing: 'doing',
};

const periodTypeMap = {
  每日: 'day',
  每天: 'day',
  日: 'day',
  天: 'day',
  每周: 'week',
  周: 'week',
  每月: 'month',
  月: 'month',
  day: 'day',
  week: 'week',
  month: 'month',
};

export function parseDuration(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const compound = value.match(
    /^(?:(\d+(?:\.\d+)?)\s*(?:小时|h|时))?(?:(\d+(?:\.\d+)?)\s*(?:分钟|min|分))?$/i,
  );
  if (compound && (compound[1] || compound[2])) {
    const hours = Number(compound[1] || 0);
    const minutes = Number(compound[2] || 0);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.round(hours * 60 + minutes);
    }
  }
  let match = value.match(/^(\d+(?:\.\d+)?)\s*(小时|h|时)$/i);
  if (match) return Math.round(Number(match[1]) * 60);
  match = value.match(/^(\d+(?:\.\d+)?)\s*(分钟|min|分)$/i);
  if (match) return Math.round(Number(match[1]));
  match = value.match(/^(\d+)$/);
  if (match) return Number(match[1]);
  return null;
}

export function formatDuration(minutes) {
  if (minutes == null) return '';
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
}

export function formatPriority(priority) {
  return { high: '高', medium: '中', low: '低' }[priority] || '中';
}

export function formatStatus(status) {
  return { done: '已完成', doing: '进行中', todo: '未完成' }[status] || '未完成';
}

function findSubject(field, subjects) {
  const text = String(field || '').trim();
  if (!text || text === '-') return null;
  return subjects.find((s) => s.name === text || s.name.includes(text) || text.includes(s.name)) || null;
}

function inferSubjectFromContent(content, subjects) {
  const bracket = content.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracket) {
    const subject = findSubject(bracket[1], subjects);
    return { subject, content: subject ? bracket[2] : content };
  }
  const found = subjects.find((s) => content.startsWith(s.name));
  if (found) return { subject: found, content: content.slice(found.name.length).replace(/^[:：\s]+/, '') };
  return { subject: null, content };
}

function parseFields(fields, context, subjects) {
  const raw = fields.map((f) => String(f ?? '').trim());
  const contentRaw = raw[0] || '';
  const hasExplicitSubject = Boolean(raw[1] && raw[1] !== '-');
  const { subject: inferredSubject, content: inferredContent } = inferSubjectFromContent(contentRaw, subjects);
  const content = hasExplicitSubject ? contentRaw : inferredContent;

  const subject = hasExplicitSubject ? findSubject(raw[1], subjects) : inferredSubject;
  const subjectName = hasExplicitSubject
    ? raw[1]
    : inferredSubject?.name || context.subjectName || '';
  const periodTypeToken = periodTypeMap[raw[2]?.toLowerCase()];
  const periodType = periodTypeToken || context.periodType || 'day';
  const period = parseChineseDate(raw[3] || '', periodType, context.period);
  const durationMinutes = parseDuration(raw[4]);
  const priority = priorityMap[raw[5]?.toLowerCase()] || context.priority || 'medium';
  const status = statusMap[raw[6]?.toLowerCase()] || 'todo';
  const notes = raw.slice(7).join(' | ').trim();

  return {
    content: content || contentRaw,
    subjectId: subject?.id ?? context.subjectId ?? null,
    subjectName,
    periodType: period.periodType,
    period: period.period,
    durationMinutes,
    priority,
    status,
    notes,
  };
}

export function parsePlanLines(text, context = {}, subjects = []) {
  const ctx = { periodType: 'day', period: todayKey(), ...context };
  const rows = [];
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith('#') ||
      line.startsWith('任务内容') ||
      line === '学习计划导出' ||
      line.startsWith('生成时间：') ||
      /^共 \d+ 条计划$/.test(line)
    ) {
      continue;
    }

    if (line.includes('|')) {
      rows.push(parseFields(line.split('|').map((s) => s.trim()), ctx, subjects));
      continue;
    }

    let content = line;
    const periodPrefix = content.match(/^(今天|明天|后天|本周|下周|本月|下月)[:：]?\s*(.*)$/);
    if (periodPrefix) {
      const period = parseChineseDate(periodPrefix[1], ctx.periodType, ctx.period);
      content = periodPrefix[2] || content;
      rows.push({ ...parseFields([content], ctx, subjects), ...period });
      continue;
    }

    rows.push(parseFields([content], ctx, subjects));
  }
  return rows;
}

export function detectBilibiliUrl(text) {
  const match = String(text || '').match(/https?:\/\/(?:www\.)?(?:bilibili\.com\/[^\s，。;；]+|b23\.tv\/[^\s，。;；]+)/i);
  return match ? match[0].replace(/[),.;。]+$/, '') : null;
}
