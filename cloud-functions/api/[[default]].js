/**
 * Academic Hub Cloud Functions - Express API
 * 单一入口处理所有 /api/* 路由
 * 注意：文件名必须是 [[default]].js 才能被识别为框架模式入口
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ============================================================
// 工具函数
// ============================================================

// JWT 工具
const JWT_SECRET = process.env.JWT_SECRET || 'academic-hub-default-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString();
}

async function createSignature(data) {
  return new Promise((resolve, reject) => {
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(data);
    resolve(base64UrlEncode(hmac.digest('buffer')));
  });
}

async function createToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const hEnc = base64UrlEncode(JSON.stringify(header));
  const now = Date.now();
  
  let expMs = 7 * 86400000; // 默认 7 天
  if (JWT_EXPIRES_IN.endsWith('d')) {
    expMs = parseInt(JWT_EXPIRES_IN) * 86400000;
  } else if (JWT_EXPIRES_IN.endsWith('h')) {
    expMs = parseInt(JWT_EXPIRES_IN) * 3600000;
  } else if (JWT_EXPIRES_IN.endsWith('m')) {
    expMs = parseInt(JWT_EXPIRES_IN) * 60000;
  }
  
  const pEnc = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + expMs) / 1000)
  }));
  const sig = await createSignature(hEnc + '.' + pEnc);
  return hEnc + '.' + pEnc + '.' + sig;
}

async function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sigInput = parts[0] + '.' + parts[1];
    const expectedSig = await createSignature(sigInput);
    if (expectedSig !== parts[2]) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function extractToken(req) {
  const auth = req.headers['authorization'];
  return auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, error: 'No token', code: 'UNAUTHORIZED' });
  verifyToken(token).then(payload => {
    if (!payload) return res.status(401).json({ success: false, error: 'Invalid token', code: 'UNAUTHORIZED' });
    req.user = payload;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin only', code: 'FORBIDDEN' });
  }
  next();
}

// 内存存储（Cloud Functions 无状态，每次调用需要重新初始化）
const kvStore = new Map();
function kvGet(key) { return kvStore.get(key) || null; }
function kvSet(key, value) { kvStore.set(key, value); }
function kvGetJson(key) {
  const v = kvStore.get(key);
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return v; }
}
function kvSetJson(key, value) { kvStore.set(key, JSON.stringify(value)); }
function kvListAdd(listKey, item) {
  const list = kvGetJson(listKey) || [];
  if (!list.includes(item)) { list.push(item); kvSetJson(listKey, list); }
}

// 初始化管理员账户
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
kvSetJson('users:admin', {
  id: 'admin-fixed',
  username: 'admin',
  displayName: 'Administrator',
  email: 'admin@academic-hub.local',
  role: 'admin',
  institution: 'Joan Academic Hub',
  createdAt: new Date().toISOString()
});
kvSet('users:by-username:admin', 'admin');
kvSetJson('spaces:index', ['admin']);

// ============================================================
// 路由定义
// ============================================================

// --- Hello (测试) ---
app.get('/hello', (req, res) => {
  res.json({ success: true, data: { message: "Joan's Academic Hub API", version: '5.0.0' } });
});

// --- Auth ---
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const user = {
      id: 'admin-fixed',
      username: 'admin',
      displayName: 'Administrator',
      role: 'admin',
      institution: 'Joan Academic Hub',
      email: 'admin@academic-hub.local',
      createdAt: new Date().toISOString()
    };
    const token = await createToken({ userId: user.id, username: user.username, role: user.role });
    return res.json({ success: true, data: { token, user } });
  }

  return res.status(401).json({ success: false, error: 'Invalid credentials', code: 'UNAUTHORIZED' });
});

app.post('/auth/register', async (req, res) => {
  const { username, password, email, displayName, researchField } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ success: false, error: 'Username 3-20 chars' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password min 6 chars' });
  }

  const existing = kvGet('users:by-username:' + username);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Username exists' });
  }

  const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  const user = {
    id: userId,
    username,
    email: email || '',
    displayName: displayName || username,
    role: 'user',
    researchField: researchField || '',
    isPublic: true,
    createdAt: now
  };

  kvSetJson('users:' + userId, user);
  kvSet('users:by-username:' + username, userId);
  kvSetJson('papers:by-user:' + userId, []);
  kvSetJson('libraries:by-user:' + userId, []);
  kvSetJson('projects:by-user:' + userId, []);
  kvSetJson('materials:by-user:' + userId, []);

  const spaceIndex = kvGetJson('spaces:index') || [];
  if (!spaceIndex.includes(username)) {
    spaceIndex.push(username);
    kvSetJson('spaces:index', spaceIndex);
  }

  const token = await createToken({ userId, username, role: user.role });
  res.json({ success: true, data: { token, user } });
});

app.get('/auth/me', authenticate, (req, res) => {
  const user = kvGetJson('users:' + req.user.userId);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });
  res.json({ success: true, data: user });
});

app.post('/auth/logout', authenticate, (req, res) => {
  res.json({ success: true });
});

// --- Papers ---
app.get('/papers', authenticate, (req, res) => {
  const userId = req.user.userId;
  const paperIds = kvGetJson('papers:by-user:' + userId) || [];
  const papers = paperIds.map(id => kvGetJson('papers:' + id)).filter(Boolean);
  res.json({ success: true, data: papers, total: papers.length });
});

app.post('/papers', authenticate, (req, res) => {
  const userId = req.user.userId;
  const paperId = 'paper-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
  const paper = Object.assign({ id: paperId, addedAt: new Date().toISOString(), userId }, req.body);
  kvSetJson('papers:' + paperId, paper);
  kvListAdd('papers:by-user:' + userId, paperId);
  res.json({ success: true, data: paper });
});

app.get('/papers/:id', authenticate, (req, res) => {
  const paper = kvGetJson('papers:' + req.params.id);
  if (!paper) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: paper });
});

app.put('/papers/:id', authenticate, (req, res) => {
  const paper = kvGetJson('papers:' + req.params.id);
  if (!paper) return res.status(404).json({ success: false, error: 'Not found' });
  const updated = Object.assign({}, paper, req.body, { id: req.params.id });
  kvSetJson('papers:' + req.params.id, updated);
  res.json({ success: true, data: updated });
});

app.delete('/papers/:id', authenticate, (req, res) => {
  kvStore.delete('papers:' + req.params.id);
  res.json({ success: true });
});

// --- Projects ---
app.get('/projects', authenticate, (req, res) => {
  const userId = req.user.userId;
  const ids = kvGetJson('projects:by-user:' + userId) || [];
  const projects = ids.map(id => kvGetJson('projects:' + id)).filter(Boolean);
  res.json({ success: true, data: projects });
});

app.post('/projects', authenticate, (req, res) => {
  const userId = req.user.userId;
  const id = 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
  const proj = Object.assign({ id, userId, createdAt: new Date().toISOString() }, req.body);
  kvSetJson('projects:' + id, proj);
  kvListAdd('projects:by-user:' + userId, id);
  res.json({ success: true, data: proj });
});

// --- Libraries ---
app.get('/libraries', authenticate, (req, res) => {
  const userId = req.user.userId;
  const ids = kvGetJson('libraries:by-user:' + userId) || [];
  const libs = ids.map(id => kvGetJson('libraries:' + id)).filter(Boolean);
  res.json({ success: true, data: libs });
});

app.post('/libraries', authenticate, (req, res) => {
  const userId = req.user.userId;
  const id = 'lib-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
  const lib = Object.assign({ id, userId, createdAt: new Date().toISOString() }, req.body);
  kvSetJson('libraries:' + id, lib);
  kvListAdd('libraries:by-user:' + userId, id);
  res.json({ success: true, data: lib });
});

// --- Materials ---
app.get('/materials', authenticate, (req, res) => {
  const userId = req.user.userId;
  const ids = kvGetJson('materials:by-user:' + userId) || [];
  const mats = ids.map(id => kvGetJson('materials:' + id)).filter(Boolean);
  res.json({ success: true, data: mats });
});

// --- Spaces (公开) ---
app.get('/spaces', (req, res) => {
  const spaceIndex = kvGetJson('spaces:index') || [];
  const spaces = spaceIndex.map(username => {
    const userId = kvGet('users:by-username:' + username) || username;
    const user = kvGetJson('users:' + userId) || kvGetJson('users:by-username:' + username);
    if (!user || user.isPublic === false) return null;
    return {
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio || '',
      institution: user.institution || '',
      researchField: user.researchField || '',
      paperCount: (kvGetJson('papers:by-user:' + (user.id || userId)) || []).length,
      viewCount: user.viewCount || 0,
      createdAt: user.createdAt
    };
  }).filter(Boolean);
  res.json({ success: true, data: spaces });
});

// --- Admin ---
app.get('/admin/stats', authenticate, requireAdmin, (req, res) => {
  const spaceIndex = kvGetJson('spaces:index') || [];
  res.json({ success: true, data: { totalUsers: spaceIndex.length, systemStatus: 'operational' } });
});

app.get('/admin/users', authenticate, requireAdmin, (req, res) => {
  const spaceIndex = kvGetJson('spaces:index') || [];
  const users = spaceIndex.map(username => {
    const userId = kvGet('users:by-username:' + username);
    const user = kvGetJson('users:' + userId);
    return user ? Object.assign({}, user, { paperCount: (kvGetJson('papers:by-user:' + userId) || []).length }) : null;
  }).filter(Boolean);
  res.json({ success: true, data: { users, pagination: { page: 1, limit: 20, total: users.length, totalPages: 1 } } });
});

// --- Settings ---
app.get('/settings', authenticate, (req, res) => {
  const userId = req.user.userId;
  res.json({ success: true, data: kvGetJson('settings:' + userId) || {} });
});

app.put('/settings', authenticate, (req, res) => {
  const userId = req.user.userId;
  kvSetJson('settings:' + userId, req.body);
  res.json({ success: true, data: req.body });
});

// --- Search ---
app.get('/search', authenticate, (req, res) => {
  res.json({ success: true, data: { papers: [], projects: [], libraries: [] } });
});

// --- Chats ---
app.get('/chats', authenticate, (req, res) => {
  const userId = req.user.userId;
  const ids = kvGetJson('chats:by-user:' + userId) || [];
  const chats = ids.map(id => kvGetJson('chats:' + id)).filter(Boolean);
  res.json({ success: true, data: chats });
});

// ============================================================
// 导出处理函数（ES Module 语法，符合 EdgeOne Pages 规范）
// ============================================================
export default app;
