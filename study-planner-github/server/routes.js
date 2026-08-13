import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from './db.js';
import {
  createUserWithDefaults,
  findUserByUsername,
  requireAuth,
  signToken,
  verifyPassword,
} from './auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '操作过于频繁，请稍后再试' },
});

const validPriorities = new Set(['low', 'medium', 'high']);
const validStatuses = new Set(['todo', 'doing', 'done']);
const validPeriodTypes = new Set(['day', 'week', 'month']);

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    createdAt: user.created_at,
  };
}

function sanitizePlan(input) {
  const plan = {};
  if (typeof input.content === 'string') {
    plan.content = input.content.trim();
  }
  if (typeof input.notes === 'string') {
    plan.notes = input.notes.trim();
  }
  if (validPeriodTypes.has(input.periodType)) {
    plan.periodType = input.periodType;
  }
  if (typeof input.period === 'string') {
    plan.period = input.period.trim();
  }
  const minutes = Number(input.durationMinutes);
  if (Number.isFinite(minutes) && minutes >= 0) {
    plan.durationMinutes = Math.round(minutes);
  }
  if (validPriorities.has(input.priority)) {
    plan.priority = input.priority;
  }
  if (validStatuses.has(input.status)) {
    plan.status = input.status;
  }
  const subjectId = Number(input.subjectId);
  if (Number.isInteger(subjectId) && subjectId > 0) {
    plan.subjectId = subjectId;
  }
  plan.sortOrder = Number.isInteger(input.sortOrder) ? input.sortOrder : 0;
  return plan;
}

function assertPlanShape(plan) {
  if (!plan.content) return '任务内容不能为空';
  if (!plan.periodType) return '缺少周期类型';
  if (!plan.period) return '缺少日期/周次/月份';
  return null;
}

router.post('/api/auth/register', authLimiter, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const nickname = String(req.body.nickname || '').trim();

  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(username)) {
    return res.status(400).json({ error: '用户名需为 2-20 位字母、数字、下划线或中文' });
  }
  if (password.length < 6 || password.length > 64) {
    return res.status(400).json({ error: '密码长度需为 6-64 位' });
  }
  if (findUserByUsername(username)) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const user = createUserWithDefaults({ username, password, nickname });
  return res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/api/auth/login', authLimiter, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const safeUser = publicUser(user);
  return res.json({ token: signToken(user), user: safeUser });
});

router.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.get('/api/subjects', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM subjects WHERE user_id = ? ORDER BY sort_order, id')
    .all(req.user.id);
  res.json({ subjects: rows });
});

router.post('/api/subjects', requireAuth, (req, res) => {
  const name = String(req.body.name || '').trim();
  const color = String(req.body.color || '').trim();
  if (!name || name.length > 30) {
    return res.status(400).json({ error: '科目名称需为 1-30 个字符' });
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: '颜色格式不正确' });
  }
  const existing = db
    .prepare('SELECT id FROM subjects WHERE user_id = ? AND name = ?')
    .get(req.user.id, name);
  if (existing) {
    return res.status(409).json({ error: '已存在同名科目' });
  }
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM subjects WHERE user_id = ?')
    .get(req.user.id).maxOrder;
  const result = db
    .prepare('INSERT INTO subjects (user_id, name, color, sort_order) VALUES (?, ?, ?, ?)')
    .run(req.user.id, name, color, maxOrder + 1);
  const subject = db
    .prepare('SELECT * FROM subjects WHERE id = ?')
    .get(Number(result.lastInsertRowid));
  res.json({ subject });
});

router.put('/api/subjects/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!subject) return res.status(404).json({ error: '科目不存在' });

  const name = String(req.body.name ?? subject.name).trim();
  const color = String(req.body.color ?? subject.color).trim();
  if (!name || name.length > 30) return res.status(400).json({ error: '科目名称需为 1-30 个字符' });
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: '颜色格式不正确' });
  db.prepare('UPDATE subjects SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  res.json({ subject: db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) });
});

router.delete('/api/subjects/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!subject) return res.status(404).json({ error: '科目不存在' });
  db.prepare('UPDATE plans SET subject_id = NULL WHERE subject_id = ?').run(id);
  db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.get('/api/plans', requireAuth, (req, res) => {
  const rows = db
    .prepare(`
      SELECT p.*, s.name AS subject_name, s.color AS subject_color
      FROM plans p
      LEFT JOIN subjects s ON s.id = p.subject_id
      WHERE p.user_id = ?
      ORDER BY p.period DESC, p.sort_order, p.id DESC
      LIMIT 5000
    `)
    .all(req.user.id);
  res.json({ plans: rows });
});

router.post('/api/plans', requireAuth, (req, res) => {
  const raw = Array.isArray(req.body) ? req.body : req.body?.plans || [req.body];
  if (!Array.isArray(raw) || raw.length === 0) {
    return res.status(400).json({ error: '没有可添加的计划' });
  }
  if (raw.length > 200) {
    return res.status(400).json({ error: '单次最多添加 200 条计划' });
  }

  const insert = db.prepare(`
    INSERT INTO plans
      (user_id, subject_id, content, notes, period_type, period, duration_minutes, priority, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const created = [];
  for (const item of raw) {
    const plan = sanitizePlan(item);
    const error = assertPlanShape(plan);
    if (error) return res.status(400).json({ error: `${error}：${item.content || '(空行)'}` });
    const subject = plan.subjectId
      ? db.prepare('SELECT id FROM subjects WHERE id = ? AND user_id = ?').get(plan.subjectId, req.user.id)
      : null;
    const result = insert.run(
      req.user.id,
      subject?.id ?? null,
      plan.content,
      plan.notes ?? '',
      plan.periodType,
      plan.period,
      plan.durationMinutes ?? null,
      plan.priority ?? 'medium',
      plan.status ?? 'todo',
      plan.sortOrder ?? 0,
    );
    created.push(Number(result.lastInsertRowid));
  }
  const list = created.map((id) =>
    db
      .prepare(`
        SELECT p.*, s.name AS subject_name, s.color AS subject_color
        FROM plans p LEFT JOIN subjects s ON s.id = p.subject_id
        WHERE p.id = ?
      `)
      .get(id),
  );
  res.status(201).json({ plans: list });
});

router.put('/api/plans/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM plans WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: '计划不存在' });

  const plan = sanitizePlan({ ...existing, ...req.body });
  const error = assertPlanShape(plan);
  if (error) return res.status(400).json({ error });
  const subjectId = plan.subjectId
    ? db.prepare('SELECT id FROM subjects WHERE id = ? AND user_id = ?').get(plan.subjectId, req.user.id)?.id ?? null
    : null;
  db.prepare(`
    UPDATE plans SET
      subject_id = ?, content = ?, notes = ?, period_type = ?, period = ?,
      duration_minutes = ?, priority = ?, status = ?, sort_order = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    subjectId,
    plan.content,
    plan.notes ?? '',
    plan.periodType,
    plan.period,
    plan.durationMinutes ?? null,
    plan.priority ?? 'medium',
    plan.status ?? 'todo',
    plan.sortOrder ?? 0,
    id,
  );
  const updated = db
    .prepare(`
      SELECT p.*, s.name AS subject_name, s.color AS subject_color
      FROM plans p LEFT JOIN subjects s ON s.id = p.subject_id
      WHERE p.id = ?
    `)
    .get(id);
  res.json({ plan: updated });
});

router.patch('/api/plans/:id/status', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '');
  if (!validStatuses.has(status)) return res.status(400).json({ error: '状态不正确' });
  const existing = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: '计划不存在' });
  db.prepare("UPDATE plans SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  res.json({ ok: true });
});

router.delete('/api/plans/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: '计划不存在' });
  db.prepare('DELETE FROM plans WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
