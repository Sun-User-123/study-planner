const pad = (n) => String(n).padStart(2, '0');

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toMonthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
}

export function addWeeks(date, amount) {
  return addDays(date, amount * 7);
}

export function toPeriodKey(date, periodType) {
  if (periodType === 'day') return toDateKey(date);
  if (periodType === 'week') return toDateKey(startOfWeek(date));
  return toMonthKey(date);
}

export function periodFromKey(key, periodType) {
  if (periodType === 'day') return startOfDay(new Date(`${key}T00:00:00`));
  if (periodType === 'week') return startOfWeek(new Date(`${key}T00:00:00`));
  return new Date(`${key}-01T00:00:00`);
}

export function shiftPeriod(key, periodType, delta) {
  const base = periodFromKey(key, periodType);
  if (periodType === 'day') return toPeriodKey(addDays(base, delta), periodType);
  if (periodType === 'week') return toPeriodKey(addWeeks(base, delta), periodType);
  return toPeriodKey(addMonths(base, delta), periodType);
}

export function periodRange(key, periodType) {
  const start = periodFromKey(key, periodType);
  if (periodType === 'day') return { start, end: start };
  if (periodType === 'week') return { start, end: addDays(start, 6) };
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { start, end };
}

export function formatPeriodLabel(key, periodType) {
  const date = periodFromKey(key, periodType);
  if (periodType === 'day') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  if (periodType === 'week') {
    const end = addDays(date, 6);
    return `${date.getMonth() + 1}月${date.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function formatDateLabel(date) {
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekNames[date.getDay()]}`;
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

export function todayKey() {
  return toPeriodKey(new Date(), 'day');
}

export function getWeekNumber(date) {
  const start = startOfWeek(date);
  const year = start.getFullYear();
  const firstMonday = startOfWeek(new Date(year, 0, 4));
  return Math.floor((start - firstMonday) / 86400000 / 7) + 1;
}

export function weekKeyFromNumber(year, weekNumber) {
  const jan4 = new Date(year, 0, 4);
  const firstMonday = startOfWeek(jan4);
  return toDateKey(addDays(firstMonday, (weekNumber - 1) * 7));
}

export function parseChineseDate(token, contextPeriodType, contextPeriod) {
  const text = String(token || '').trim();
  const today = new Date();
  const dateKeyPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const monthPattern = /^(\d{4})-(\d{1,2})$/;
  const weekPattern = /^第(\d{1,2})周$/;

  if (contextPeriodType === 'day' && dateKeyPattern.test(text)) {
    return { periodType: 'day', period: toDateKey(new Date(`${text}T00:00:00`)) };
  }
  if (contextPeriodType === 'month' && monthPattern.test(text)) {
    return { periodType: 'month', period: toMonthKey(new Date(`${text}-01T00:00:00`)) };
  }
  if (contextPeriodType === 'week' && dateKeyPattern.test(text)) {
    return { periodType: 'week', period: toPeriodKey(new Date(`${text}T00:00:00`), 'week') };
  }
  if (weekPattern.test(text)) {
    const week = Number(text.match(weekPattern)[1]);
    return { periodType: 'week', period: weekKeyFromNumber(new Date().getFullYear(), week) };
  }
  if (contextPeriodType === 'week') {
    const match = text.match(/^(\d{4})年?第?(\d{1,2})周/);
    if (match) {
      return { periodType: 'week', period: weekKeyFromNumber(Number(match[1]), Number(match[2])) };
    }
  }
  if (contextPeriodType === 'month') {
    const match = text.match(/^(\d{4})年(\d{1,2})月$/);
    if (match) return { periodType: 'month', period: `${match[1]}-${pad(Number(match[2]))}` };
  }

  const offsetMap = { 今天: 0, 明天: 1, 后天: 2 };
  if (offsetMap[text]) {
    const date = addDays(today, offsetMap[text]);
    if (contextPeriodType === 'week') return { periodType: 'week', period: toPeriodKey(date, 'week') };
    if (contextPeriodType === 'month') return { periodType: 'month', period: toPeriodKey(date, 'month') };
    return { periodType: 'day', period: toDateKey(date) };
  }

  return {
    periodType: contextPeriodType || 'day',
    period: contextPeriod || todayKey(),
  };
}
