import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { jwtSecret } from './config.js';

const defaultSubjects = [];

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signToken(user) {
  return jwt.sign(
    { uid: user.id, username: user.username },
    jwtSecret,
    { expiresIn: '90d' },
  );
}

export function createUserWithDefaults({ username, password, nickname }) {
  const { hash, salt } = hashPassword(password);
  const insert = db.prepare(
    'INSERT INTO users (username, password_hash, salt, nickname) VALUES (?, ?, ?, ?)',
  );
  const result = insert.run(username, hash, salt, nickname || username);
  const userId = Number(result.lastInsertRowid);

  const subjectInsert = db.prepare(
    'INSERT INTO subjects (user_id, name, color, sort_order) VALUES (?, ?, ?, ?)',
  );
  for (const [name, color, order] of defaultSubjects) {
    subjectInsert.run(userId, name, color, order);
  }
  return { id: userId, username, nickname: nickname || username };
}

export function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findUserById(id) {
  return db.prepare('SELECT id, username, nickname, created_at FROM users WHERE id = ?').get(id);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = findUserById(payload.uid);
    if (!user) {
      return res.status(401).json({ error: '账号不存在' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}
