/**
 * Joan's Academic Hub — Edge Functions API (v6.0 EdgeOne 正确适配版)
 * 处理所有 /api/* 路由
 *
 * 存储: EdgeOne KV Storage (全局变量 ACADEMIC_HUB_KV)
 *
 * 部署说明:
 * 1. 在 EdgeOne 控制台创建 KV 命名空间 "academic_hub_kv"
 * 2. 在项目中绑定 KV 命名空间到 Edge Functions，设置变量名为 "ACADEMIC_HUB_KV"
 * 3. 设置环境变量 JWT_SECRET
 *
 * ⚠️ 重要: KV 是全局变量，不是 context.env
 */

// ============================================================
// KV Storage 操作 (使用 context.env)
// ============================================================

let ACADEMIC_HUB_KV = null;

async function kvGet(key) {
  try {
    if (!ACADEMIC_HUB_KV) {
      console.error('[KV] KV not initialized');
      return null;
    }
    const value = await ACADEMIC_HUB_KV.get(key);
    return value || null;
  } catch (e) {
    console.error('[KV] Get error:', key, e);
    return null;
  }
}

async function kvSet(key, value) {
  try {
    if (!ACADEMIC_HUB_KV) {
      console.error('[KV] KV not initialized');
      return false;
    }
    await ACADEMIC_HUB_KV.put(key, value);
    return true;
  } catch (e) {
    console.error('[KV] Set error:', key, e);
    return false;
  }
}

async function kvDel(key) {
  try {
    if (!ACADEMIC_HUB_KV) return false;
    await ACADEMIC_HUB_KV.delete(key);
    return true;
  } catch (e) {
    console.error('[KV] Del error:', key, e);
    return false;
  }
}

async function kvHas(key) {
  try {
    if (!ACADEMIC_HUB_KV) return false;
    return await ACADEMIC_HUB_KV.get(key) !== null;
  } catch (e) {
    return false;
  }
}

// JSON 存储便捷方法
async function kvGetJson(key) {
  const v = await kvGet(key);
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return v; }
}

async function kvSetJson(key, value) {
  return kvSet(key, JSON.stringify(value));
}

// 列表操作
async function kvListGet(listKey) {
  const list = await kvGetJson(listKey);
  return list || [];
}

async function kvListAdd(listKey, item) {
  const list = await kvListGet(listKey);
  if (!list.includes(item)) {
    list.push(item);
    await kvSetJson(listKey, list);
  }
}

async function kvListRemove(listKey, item) {
  const list = await kvListGet(listKey);
  const idx = list.indexOf(item);
  if (idx > -1) {
    list.splice(idx, 1);
    await kvSetJson(listKey, list);
  }
}

// ============================================================
// 工具函数
// ============================================================

function getCorsOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return origin || '*';
}

function makeCorsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, request) {
  const headers = { ...makeCorsHeaders(request), 'Content-Type': 'application/json' };
  return new Response(JSON.stringify(data), { status, headers });
}

function success(data, message = 'Success', request) {
  return json({ success: true, data, message }, 200, request);
}

function apiError(message, status = 400, code = 'ERROR', request) {
  return json({ success: false, error: message, code }, status, request);
}

function unauthorized(request) {
  return apiError('Unauthorized', 401, 'UNAUTHORIZED', request);
}

function forbidden(request) {
  return apiError('Forbidden', 403, 'FORBIDDEN', request);
}

function notFound(message = 'Not found', request) {
  return apiError(message, 404, 'NOT_FOUND', request);
}

// ============================================================
// JWT 工具
// ============================================================

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function createSignature(data, JWT_SECRET) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

async function createToken(payload, JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const hEnc = base64UrlEncode(JSON.stringify(header));

  const now = Date.now();
  const expMs = 7 * 86400000; // 7 天
  const pEnc = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + expMs) / 1000)
  }));

  const sig = await createSignature(hEnc + '.' + pEnc, JWT_SECRET);
  return hEnc + '.' + pEnc + '.' + sig;
}

async function verifyToken(token, JWT_SECRET) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const sigInput = parts[0] + '.' + parts[1];
    const expectedSig = await createSignature(sigInput, JWT_SECRET);
    if (expectedSig !== parts[2]) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function extractToken(request) {
  const auth = request.headers.get('Authorization');
  return auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function authenticate(request, JWT_SECRET) {
  const token = extractToken(request);
  if (!token) return null;
  return await verifyToken(token, JWT_SECRET);
}

async function requireAuth(request, JWT_SECRET) {
  const payload = await authenticate(request, JWT_SECRET);
  if (!payload) return unauthorized(request);
  return payload;
}

async function requireAdmin(request, JWT_SECRET) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;
  if (payload.role !== 'admin') return forbidden(request);
  return payload;
}

// ============================================================
// 初始化管理员账户
// ============================================================

async function initAdmin() {
  const adminExists = await kvHas('users:admin');
  if (!adminExists) {
    await kvSetJson('users:admin', {
      id: 'admin',
      username: 'admin',
      displayName: 'Administrator',
      email: 'admin@academic-hub.local',
      passwordHash: await hashPassword('123456'),
      role: 'admin',
      institution: 'Joan Academic Hub',
      createdAt: new Date().toISOString()
    });
    await kvListAdd('users:index', 'admin');
    await kvListAdd('spaces:index', 'admin');
    console.log('[Init] Admin account created');
  }
}

// 贞德 (Joan) 账号初始化
async function initJoan() {
  const joanExists = await kvHas('users:joan');
  if (!joanExists) {
    await kvSetJson('users:joan', {
      id: 'user-joan',
      username: 'joan',
      displayName: 'Joan Chen (贞德)',
      email: 'joan@academic-hub.local',
      passwordHash: await hashPassword('11223344'),
      role: 'user',
      institution: 'Fudan University',
      bio: 'PhD candidate researching Graph Neural Networks and Financial AI.',
      createdAt: '2025-01-01T00:00:00.000Z'
    });
    await kvSet('users:by-username:joan', 'user-joan');
    await kvListAdd('users:index', 'user-joan');
    await kvListAdd('spaces:index', 'joan');

    // 初始化 Joan 空间配置
    await kvSetJson('spaces:joan', {
      username: 'joan',
      displayName: 'Joan Chen (贞德)',
      bio: 'PhD candidate researching Graph Neural Networks and Financial AI.',
      institution: 'Fudan University',
      theme: 'light',
      modules: ['papers', 'projects', 'library', 'chat'],
      social: { twitter: '', github: '', linkedin: '' },
      stats: { papers: 3, projects: 2, libraries: 2 },
      createdAt: '2025-01-01T00:00:00.000Z'
    });

    // 初始化 Joan 的论文
    const joanPapers = [
      { id: 'paper-joan-1', title: 'Semi-Supervised Classification with Graph Convolutional Networks', authors: ['T.N. Kipf', 'M. Welling'], year: 2017, venue: 'ICLR 2017', abstract: 'We present a scalable approach for semi-supervised learning on graph-structured data.', tags: ['GNN', '经典论文'], citations: 15000, createdAt: '2026-04-20T10:00:00Z' },
      { id: 'paper-joan-2', title: 'Graph Attention Networks', authors: ['P. Veličković', 'G. Cucurull'], year: 2018, venue: 'ICLR 2018', abstract: 'We propose Graph Attention Networks (GATs), novel neural network architectures.', tags: ['GNN', '注意力机制'], citations: 8000, createdAt: '2026-04-21T08:00:00Z' },
      { id: 'paper-joan-3', title: 'Heterogeneous Graph Attention Network', authors: ['X. Wang', 'H. Ji'], year: 2019, venue: 'WWW 2019', abstract: 'We propose the Heterogeneous Graph Attention Network (HAN).', tags: ['HGNN', '元路径'], citations: 3000, createdAt: '2026-04-22T12:00:00Z' },
    ];

    for (const paper of joanPapers) {
      await kvSetJson('papers:' + paper.id, { ...paper, userId: 'user-joan', username: 'joan' });
    }
    await kvSetJson('users:user-joan:papers', joanPapers.map(p => p.id));

    // 初始化 Joan 的项目
    const joanProjects = [
      { id: 'project-joan-1', name: 'HGNN 金融欺诈检测综述', description: '基于异质图神经网络的金融欺诈检测方法综述', status: 'active', progress: 60, tags: ['综述', 'HGNN', '金融欺诈'], createdAt: '2026-03-01T00:00:00Z' },
      { id: 'project-joan-2', name: 'GNN 核心理论梳理', description: '系统梳理 GNN 核心理论', status: 'completed', progress: 100, tags: ['学习', 'GNN', '理论'], createdAt: '2026-02-01T00:00:00Z' },
    ];

    for (const proj of joanProjects) {
      await kvSetJson('projects:' + proj.id, { ...proj, userId: 'user-joan', username: 'joan' });
    }
    await kvSetJson('users:user-joan:projects', joanProjects.map(p => p.id));

    // 初始化 Joan 的文献库
    const joanLibraries = [
      { id: 'lib-joan-1', name: 'GNN 核心论文', description: '图神经网络经典论文', paperCount: 3, tags: ['GNN'], createdAt: '2026-03-05T00:00:00Z' },
      { id: 'lib-joan-2', name: 'HGNN 研究', description: '异质图神经网络相关研究', paperCount: 1, tags: ['HGNN'], createdAt: '2026-03-10T00:00:00Z' },
    ];

    for (const lib of joanLibraries) {
      await kvSetJson('libraries:' + lib.id, { ...lib, userId: 'user-joan', username: 'joan', papers: [] });
    }
    await kvSetJson('users:user-joan:libraries', joanLibraries.map(l => l.id));

    console.log('[Init] Joan account and data created');
  }
}

// 简单密码哈希 (使用 Web Crypto API)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = 'academic-hub-salt-2026';
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 生成唯一 ID
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================
// 路由处理器 - 认证
// ============================================================

async function handleLogin(request, JWT_SECRET) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return apiError('Username and password required', 400, 'VALIDATION_ERROR', request);
    }

    // 管理员特殊处理
    if (username === 'admin') {
      const admin = await kvGetJson('users:admin');
      if (admin && await verifyPassword(password, admin.passwordHash)) {
        const token = await createToken({ userId: admin.id, username: admin.username, role: admin.role }, JWT_SECRET);
        const { passwordHash, ...safeUser } = admin;
        return success({ token, user: safeUser }, 'Login successful', request);
      }
      return unauthorized(request);
    }

    // 贞德账号特殊处理
    if (username === 'joan') {
      const user = await kvGetJson('users:joan');
      if (user && await verifyPassword(password, user.passwordHash)) {
        const token = await createToken({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET);
        const { passwordHash, ...safeUser } = user;
        return success({ token, user: safeUser }, 'Login successful', request);
      }
      return unauthorized(request);
    }

    // 普通用户登录
    const userId = await kvGet('users:by-username:' + username);
    if (!userId) return unauthorized(request);

    const user = await kvGetJson('users:' + userId);
    if (!user || !await verifyPassword(password, user.passwordHash)) {
      return unauthorized(request);
    }

    const token = await createToken({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET);
    const { passwordHash, ...safeUser } = user;
    return success({ token, user: safeUser }, 'Login successful', request);
  } catch (e) {
    console.error('[Login] Error:', e);
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

// 增强的注册处理器 - v2
async function handleRegister(request, JWT_SECRET) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  try {
    const body = await request.json();
    const { username, password, email, displayName, institution, researchField } = body;

    // 基本验证
    if (!username || !password) {
      return apiError('用户名和密码不能为空', 400, 'VALIDATION_ERROR', request);
    }

    // 用户名格式验证
    if (username.length < 3 || username.length > 20) {
      return apiError('用户名长度需在 3-20 个字符之间', 400, 'VALIDATION_ERROR', request);
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
      return apiError('用户名必须以字母开头，只能包含字母、数字和下划线', 400, 'VALIDATION_ERROR', request);
    }

    // 保留用户名检查
    const reservedUsernames = ['admin', 'root', 'system', 'user', 'joan', 'test', 'master', 'api', 'www'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return apiError('该用户名已被保留，请选择其他用户名', 409, 'CONFLICT', request);
    }

    // 密码强度验证
    if (password.length < 6) {
      return apiError('密码长度至少 6 位', 400, 'VALIDATION_ERROR', request);
    }
    
    // 密码强度检查
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (password.length < 8 && !hasUpperCase && !hasSpecial) {
      return apiError('密码强度太弱，建议使用至少 8 位并包含大小写字母和数字', 400, 'VALIDATION_ERROR', request);
    }

    // 检查用户名是否存在
    if (await kvHas('users:by-username:' + username)) {
      return apiError('该用户名已被使用', 409, 'CONFLICT', request);
    }

    // 邮箱格式验证（如果提供）
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('请输入有效的邮箱地址', 400, 'VALIDATION_ERROR', request);
    }

    // 过滤 XSS 和特殊字符
    const sanitize = (str) => {
      if (!str) return '';
      return String(str).replace(/[<>'"]/g, '').trim().substring(0, 500);
    };

    const userId = generateId('user');
    const user = {
      id: userId,
      username,
      displayName: sanitize(displayName) || username,
      email: sanitize(email) || '',
      institution: sanitize(institution) || '',
      bio: '',
      avatar: '',
      role: 'user',
      isActive: true,
      researchField: sanitize(researchField) || '',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      stats: {
        papers: 0,
        projects: 0,
        libraries: 0,
      }
    };

    await kvSetJson('users:' + userId, user);
    await kvSet('users:by-username:' + username, userId);
    await kvListAdd('users:index', userId);
    await kvListAdd('spaces:index', username);

    // 初始化用户空间配置
    await kvSetJson('spaces:' + username, {
      username,
      displayName: user.displayName,
      bio: '',
      institution: user.institution,
      theme: 'light',
      modules: ['papers', 'projects', 'library', 'chat'],
      social: { twitter: '', github: '', linkedin: '' },
      stats: { papers: 0, projects: 0, libraries: 0 },
      createdAt: new Date().toISOString()
    });

    // 初始化用户数据索引
    await kvSetJson('users:' + userId + ':papers', []);
    await kvSetJson('users:' + userId + ':projects', []);
    await kvSetJson('users:' + userId + ':libraries', []);

    // 创建 Token
    const token = await createToken({ userId, username, role: user.role }, JWT_SECRET);
    
    // 返回安全用户信息（不包含密码哈希）
    const { passwordHash, ...safeUser } = user;
    
    console.log('[Register] New user registered:', username);
    return success({ token, user: safeUser }, '注册成功', request);
  } catch (e) {
    console.error('[Register] Error:', e);
    return apiError('注册请求处理失败', 400, 'BAD_REQUEST', request);
  }
}

async function handleMe(request, JWT_SECRET) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const user = await kvGetJson('users:' + payload.userId);
  if (!user) return notFound('User not found', request);

  const { passwordHash, ...safeUser } = user;
  return success(safeUser, 'Success', request);
}

async function handleLogout(request) {
  return success(null, 'Logout successful', request);
}

// ============================================================
// 路由处理器 - 用户管理 (管理员)
// ============================================================

async function handleGetUsers(request, JWT_SECRET) {
  const payload = await requireAdmin(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const userIds = await kvListGet('users:index');
  const users = [];

  for (const userId of userIds) {
    const user = await kvGetJson('users:' + userId);
    if (user) {
      const { passwordHash, ...safeUser } = user;
      users.push(safeUser);
    }
  }

  return success(users, 'Success', request);
}

async function handleGetUser(request, JWT_SECRET, userId) {
  await authenticate(request, JWT_SECRET);

  const user = await kvGetJson('users:' + userId);
  if (!user) return notFound('User not found', request);

  const { passwordHash, ...safeUser } = user;
  return success(safeUser, 'Success', request);
}

async function handleUpdateUser(request, JWT_SECRET, userId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  if (payload.userId !== userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  const user = await kvGetJson('users:' + userId);
  if (!user) return notFound('User not found', request);

  try {
    const body = await request.json();
    const { displayName, email, institution, bio, avatar } = body;

    if (displayName !== undefined) user.displayName = displayName;
    if (email !== undefined && (payload.role === 'admin' || payload.userId === userId)) user.email = email;
    if (institution !== undefined) user.institution = institution;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    user.updatedAt = new Date().toISOString();

    await kvSetJson('users:' + userId, user);

    if (body.username && body.username !== user.username) {
      if (await kvHas('users:by-username:' + body.username)) {
        return apiError('Username already exists', 409, 'CONFLICT', request);
      }
      await kvDel('users:by-username:' + user.username);
      await kvSet('users:by-username:' + body.username, userId);
      user.username = body.username;
    }

    const { passwordHash, ...safeUser } = user;
    return success(safeUser, 'User updated', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleDeleteUser(request, JWT_SECRET, userId) {
  const payload = await requireAdmin(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  if (userId === 'admin' || userId === 'user-joan') {
    return apiError('Cannot delete system account', 400, 'VALIDATION_ERROR', request);
  }

  const user = await kvGetJson('users:' + userId);
  if (!user) return notFound('User not found', request);

  await kvDel('users:' + userId);
  await kvDel('users:by-username:' + user.username);
  await kvListRemove('spaces:index', user.username);
  await kvDel('spaces:' + user.username);
  await kvDel('users:' + userId + ':papers');
  await kvDel('users:' + userId + ':projects');
  await kvDel('users:' + userId + ':libraries');

  const paperIds = await kvGetJson('users:' + userId + ':papers');
  for (const paperId of paperIds) {
    await kvDel('papers:' + paperId);
  }

  const projectIds = await kvGetJson('users:' + userId + ':projects');
  for (const projectId of projectIds) {
    await kvDel('projects:' + projectId);
  }

  const libIds = await kvGetJson('users:' + userId + ':libraries');
  for (const libId of libIds) {
    await kvDel('libraries:' + libId);
  }

  return success(null, 'User deleted', request);
}

// ============================================================
// 路由处理器 - 空间管理
// ============================================================

async function handleGetSpaces() {
  const spaceUsernames = await kvListGet('spaces:index');
  const spaces = [];

  for (const username of spaceUsernames) {
    const space = await kvGetJson('spaces:' + username);
    if (space) {
      spaces.push({
        username: space.username,
        displayName: space.displayName,
        bio: space.bio,
        institution: space.institution,
        stats: space.stats,
        createdAt: space.createdAt
      });
    }
  }

  return success(spaces, 'Success');
}

async function handleGetSpace(request, username) {
  const space = await kvGetJson('spaces:' + username);
  if (!space) return notFound('Space not found', request);

  return success({
    username: space.username,
    displayName: space.displayName,
    bio: space.bio,
    institution: space.institution,
    avatar: space.avatar || '',
    theme: space.theme,
    modules: space.modules,
    social: space.social,
    stats: space.stats,
    createdAt: space.createdAt
  }, 'Success', request);
}

async function handleUpdateSpace(request, JWT_SECRET, username) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  if (payload.username !== username && payload.role !== 'admin') {
    return forbidden(request);
  }

  const space = await kvGetJson('spaces:' + username);
  if (!space) return notFound('Space not found', request);

  try {
    const body = await request.json();
    const { displayName, bio, institution, theme, modules, social, avatar } = body;

    if (displayName !== undefined) space.displayName = displayName;
    if (bio !== undefined) space.bio = bio;
    if (institution !== undefined) space.institution = institution;
    if (theme !== undefined) space.theme = theme;
    if (modules !== undefined) space.modules = modules;
    if (social !== undefined) space.social = { ...space.social, ...social };
    if (avatar !== undefined) space.avatar = avatar;

    space.updatedAt = new Date().toISOString();

    await kvSetJson('spaces:' + username, space);

    const user = await kvGetJson('users:' + payload.userId);
    if (user) {
      if (displayName) user.displayName = displayName;
      user.updatedAt = new Date().toISOString();
      await kvSetJson('users:' + payload.userId, user);
    }

    return success(space, 'Space updated', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

// ============================================================
// 路由处理器 - 论文管理
// ============================================================

async function handleGetPapers(request, username) {
  const userId = await kvGet('users:by-username:' + username);
  if (!userId) return notFound('User not found', request);

  const paperIds = await kvGetJson('users:' + userId + ':papers') || [];
  const papers = [];

  for (const paperId of paperIds) {
    const paper = await kvGetJson('papers:' + paperId);
    if (paper) {
      papers.push({
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        tags: paper.tags,
        citations: paper.citations || 0,
        pdfUrl: paper.pdfUrl || '',
        createdAt: paper.createdAt
      });
    }
  }

  return success(papers, 'Success', request);
}

async function handleCreatePaper(request, JWT_SECRET) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  try {
    const body = await request.json();
    const { title, abstract, authors, year, venue, tags, pdfUrl } = body;

    if (!title) {
      return apiError('Title is required', 400, 'VALIDATION_ERROR', request);
    }

    const paperId = generateId('paper');
    const paper = {
      id: paperId,
      userId: payload.userId,
      username: payload.username,
      title,
      abstract: abstract || '',
      authors: authors || [],
      year: year || new Date().getFullYear(),
      venue: venue || '',
      tags: tags || [],
      citations: 0,
      pdfUrl: pdfUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kvSetJson('papers:' + paperId, paper);
    await kvListAdd('users:' + payload.userId + ':papers', paperId);

    const space = await kvGetJson('spaces:' + payload.username);
    if (space) {
      space.stats.papers = (space.stats.papers || 0) + 1;
      await kvSetJson('spaces:' + payload.username, space);
    }

    return success(paper, 'Paper created', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleGetPaper(request, paperId) {
  const paper = await kvGetJson('papers:' + paperId);
  if (!paper) return notFound('Paper not found', request);

  return success({
    id: paper.id,
    userId: paper.userId,
    username: paper.username,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    year: paper.year,
    venue: paper.venue,
    tags: paper.tags,
    citations: paper.citations || 0,
    pdfUrl: paper.pdfUrl || '',
    doi: paper.doi || '',
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt
  }, 'Success', request);
}

async function handleUpdatePaper(request, JWT_SECRET, paperId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const paper = await kvGetJson('papers:' + paperId);
  if (!paper) return notFound('Paper not found', request);

  if (paper.userId !== payload.userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  try {
    const body = await request.json();
    const { title, abstract, authors, year, venue, tags, pdfUrl, doi } = body;

    if (title !== undefined) paper.title = title;
    if (abstract !== undefined) paper.abstract = abstract;
    if (authors !== undefined) paper.authors = authors;
    if (year !== undefined) paper.year = year;
    if (venue !== undefined) paper.venue = venue;
    if (tags !== undefined) paper.tags = tags;
    if (pdfUrl !== undefined) paper.pdfUrl = pdfUrl;
    if (doi !== undefined) paper.doi = doi;
    paper.updatedAt = new Date().toISOString();

    await kvSetJson('papers:' + paperId, paper);
    return success(paper, 'Paper updated', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleDeletePaper(request, JWT_SECRET, paperId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const paper = await kvGetJson('papers:' + paperId);
  if (!paper) return notFound('Paper not found', request);

  if (paper.userId !== payload.userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  await kvDel('papers:' + paperId);
  await kvListRemove('users:' + paper.userId + ':papers', paperId);

  const space = await kvGetJson('spaces:' + paper.username);
  if (space && space.stats.papers > 0) {
    space.stats.papers -= 1;
    await kvSetJson('spaces:' + paper.username, space);
  }

  return success(null, 'Paper deleted', request);
}

// ============================================================
// 路由处理器 - 项目管理
// ============================================================

async function handleGetProjects(request, username) {
  const userId = await kvGet('users:by-username:' + username);
  if (!userId) return notFound('User not found', request);

  const projectIds = await kvGetJson('users:' + userId + ':projects') || [];
  const projects = [];

  for (const projectId of projectIds) {
    const project = await kvGetJson('projects:' + projectId);
    if (project) {
      projects.push({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress,
        tags: project.tags,
        startDate: project.startDate,
        endDate: project.endDate,
        createdAt: project.createdAt
      });
    }
  }

  return success(projects, 'Success', request);
}

async function handleCreateProject(request, JWT_SECRET) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  try {
    const body = await request.json();
    const { name, description, status, progress, tags, startDate, endDate, objectives } = body;

    if (!name) {
      return apiError('Project name is required', 400, 'VALIDATION_ERROR', request);
    }

    const projectId = generateId('project');
    const project = {
      id: projectId,
      userId: payload.userId,
      username: payload.username,
      name,
      description: description || '',
      status: status || 'active',
      progress: progress || 0,
      tags: tags || [],
      startDate: startDate || '',
      endDate: endDate || '',
      objectives: objectives || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kvSetJson('projects:' + projectId, project);
    await kvListAdd('users:' + payload.userId + ':projects', projectId);

    const space = await kvGetJson('spaces:' + payload.username);
    if (space) {
      space.stats.projects = (space.stats.projects || 0) + 1;
      await kvSetJson('spaces:' + payload.username, space);
    }

    return success(project, 'Project created', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleGetProject(request, projectId) {
  const project = await kvGetJson('projects:' + projectId);
  if (!project) return notFound('Project not found', request);

  return success(project, 'Success', request);
}

async function handleUpdateProject(request, JWT_SECRET, projectId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const project = await kvGetJson('projects:' + projectId);
  if (!project) return notFound('Project not found', request);

  if (project.userId !== payload.userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  try {
    const body = await request.json();
    const { name, description, status, progress, tags, startDate, endDate, objectives } = body;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (progress !== undefined) project.progress = progress;
    if (tags !== undefined) project.tags = tags;
    if (startDate !== undefined) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (objectives !== undefined) project.objectives = objectives;
    project.updatedAt = new Date().toISOString();

    await kvSetJson('projects:' + projectId, project);
    return success(project, 'Project updated', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleDeleteProject(request, JWT_SECRET, projectId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const project = await kvGetJson('projects:' + projectId);
  if (!project) return notFound('Project not found', request);

  if (project.userId !== payload.userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  await kvDel('projects:' + projectId);
  await kvListRemove('users:' + project.userId + ':projects', projectId);

  const space = await kvGetJson('spaces:' + project.username);
  if (space && space.stats.projects > 0) {
    space.stats.projects -= 1;
    await kvSetJson('spaces:' + project.username, space);
  }

  return success(null, 'Project deleted', request);
}

// ============================================================
// 路由处理器 - 文献库管理
// ============================================================

async function handleGetLibraries(request, username) {
  const userId = await kvGet('users:by-username:' + username);
  if (!userId) return notFound('User not found', request);

  const libIds = await kvGetJson('users:' + userId + ':libraries') || [];
  const libraries = [];

  for (const libId of libIds) {
    const lib = await kvGetJson('libraries:' + libId);
    if (lib) {
      libraries.push({
        id: lib.id,
        name: lib.name,
        description: lib.description,
        paperCount: lib.paperCount || 0,
        tags: lib.tags,
        createdAt: lib.createdAt
      });
    }
  }

  return success(libraries, 'Success', request);
}

async function handleCreateLibrary(request, JWT_SECRET) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  try {
    const body = await request.json();
    const { name, description, tags } = body;

    if (!name) {
      return apiError('Library name is required', 400, 'VALIDATION_ERROR', request);
    }

    const libId = generateId('lib');
    const lib = {
      id: libId,
      userId: payload.userId,
      username: payload.username,
      name,
      description: description || '',
      tags: tags || [],
      papers: [],
      paperCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kvSetJson('libraries:' + libId, lib);
    await kvListAdd('users:' + payload.userId + ':libraries', libId);

    const space = await kvGetJson('spaces:' + payload.username);
    if (space) {
      space.stats.libraries = (space.stats.libraries || 0) + 1;
      await kvSetJson('spaces:' + payload.username, space);
    }

    return success(lib, 'Library created', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleGetLibrary(request, libId) {
  const lib = await kvGetJson('libraries:' + libId);
  if (!lib) return notFound('Library not found', request);

  return success(lib, 'Success', request);
}

async function handleUpdateLibrary(request, JWT_SECRET, libId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const lib = await kvGetJson('libraries:' + libId);
  if (!lib) return notFound('Library not found', request);

  if (lib.userId !== payload.userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  try {
    const body = await request.json();
    const { name, description, tags, papers } = body;

    if (name !== undefined) lib.name = name;
    if (description !== undefined) lib.description = description;
    if (tags !== undefined) lib.tags = tags;
    if (papers !== undefined) {
      lib.papers = papers;
      lib.paperCount = papers.length;
    }
    lib.updatedAt = new Date().toISOString();

    await kvSetJson('libraries:' + libId, lib);
    return success(lib, 'Library updated', request);
  } catch (e) {
    return apiError('Invalid request', 400, 'BAD_REQUEST', request);
  }
}

async function handleDeleteLibrary(request, JWT_SECRET, libId) {
  const payload = await requireAuth(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const lib = await kvGetJson('libraries:' + libId);
  if (!lib) return notFound('Library not found', request);

  if (lib.userId !== payload.userId && payload.role !== 'admin') {
    return forbidden(request);
  }

  await kvDel('libraries:' + libId);
  await kvListRemove('users:' + lib.userId + ':libraries', libId);

  const space = await kvGetJson('spaces:' + lib.username);
  if (space && space.stats.libraries > 0) {
    space.stats.libraries -= 1;
    await kvSetJson('spaces:' + lib.username, space);
  }

  return success(null, 'Library deleted', request);
}

// ============================================================
// 路由处理器 - 统计信息 (管理员)
// ============================================================

async function handleGetStats(request, JWT_SECRET) {
  const payload = await requireAdmin(request, JWT_SECRET);
  if (payload instanceof Response) return payload;

  const userIds = await kvListGet('users:index');

  let totalPapers = 0, totalProjects = 0, totalLibraries = 0;

  for (const userId of userIds) {
    const papers = await kvGetJson('users:' + userId + ':papers') || [];
    const projects = await kvGetJson('users:' + userId + ':projects') || [];
    const libraries = await kvGetJson('users:' + userId + ':libraries') || [];
    totalPapers += papers.length;
    totalProjects += projects.length;
    totalLibraries += libraries.length;
  }

  return success({
    users: userIds.length,
    papers: totalPapers,
    projects: totalProjects,
    libraries: totalLibraries,
    spaces: userIds.length
  }, 'Success', request);
}

// ============================================================
// 主入口 (Edge Functions 命名导出方式)
// ============================================================

export async function onRequest(context) {
  const { request, env } = context;

  // 初始化 KV Storage
  ACADEMIC_HUB_KV = env.ACADEMIC_HUB_KV;

  // 从环境变量获取 JWT_SECRET
  const JWT_SECRET = env.JWT_SECRET || 'academic-hub-v4-jwt-secret-key-2026-prod';

  // 初始化系统账户
  await initAdmin();
  await initJoan();

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: makeCorsHeaders(request) });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  // 路由分发
  // ========================================
  // 认证路由
  // ========================================
  if (segments[0] === 'auth') {
    if (segments[1] === 'login') return handleLogin(request, JWT_SECRET);
    if (segments[1] === 'register') return handleRegister(request, JWT_SECRET);
    if (segments[1] === 'me') return handleMe(request, JWT_SECRET);
    if (segments[1] === 'logout') return handleLogout(request);
  }

  // ========================================
  // 用户管理路由 (管理员)
  // ========================================
  if (segments[0] === 'users') {
    if (segments.length === 1) return handleGetUsers(request, JWT_SECRET);
    if (segments.length === 2) {
      if (request.method === 'GET') return handleGetUser(request, JWT_SECRET, segments[1]);
      if (request.method === 'PUT') return handleUpdateUser(request, JWT_SECRET, segments[1]);
      if (request.method === 'DELETE') return handleDeleteUser(request, JWT_SECRET, segments[1]);
    }
  }

  // ========================================
  // 空间路由
  // ========================================
  if (segments[0] === 'spaces') {
    if (segments.length === 1) return handleGetSpaces();
    if (segments.length === 2) {
      if (request.method === 'GET') return handleGetSpace(request, segments[1]);
      if (request.method === 'PUT') return handleUpdateSpace(request, JWT_SECRET, segments[1]);
    }
  }

  // ========================================
  // 论文路由
  // ========================================
  if (segments[0] === 'papers') {
    if (request.method === 'POST') return handleCreatePaper(request, JWT_SECRET);
    if (segments.length === 2) {
      if (request.method === 'GET') return handleGetPaper(request, segments[1]);
      if (request.method === 'PUT') return handleUpdatePaper(request, JWT_SECRET, segments[1]);
      if (request.method === 'DELETE') return handleDeletePaper(request, JWT_SECRET, segments[1]);
    }
  }

  // 用户的论文列表
  if (segments[0] === 'users' && segments[2] === 'papers') {
    return handleGetPapers(request, segments[1]);
  }

  // ========================================
  // 项目路由
  // ========================================
  if (segments[0] === 'projects') {
    if (request.method === 'POST') return handleCreateProject(request, JWT_SECRET);
    if (segments.length === 2) {
      if (request.method === 'GET') return handleGetProject(request, segments[1]);
      if (request.method === 'PUT') return handleUpdateProject(request, JWT_SECRET, segments[1]);
      if (request.method === 'DELETE') return handleDeleteProject(request, JWT_SECRET, segments[1]);
    }
  }

  // 用户的研究项目列表
  if (segments[0] === 'users' && segments[2] === 'projects') {
    return handleGetProjects(request, segments[1]);
  }

  // ========================================
  // 文献库路由
  // ========================================
  if (segments[0] === 'libraries') {
    if (request.method === 'POST') return handleCreateLibrary(request, JWT_SECRET);
    if (segments.length === 2) {
      if (request.method === 'GET') return handleGetLibrary(request, segments[1]);
      if (request.method === 'PUT') return handleUpdateLibrary(request, JWT_SECRET, segments[1]);
      if (request.method === 'DELETE') return handleDeleteLibrary(request, JWT_SECRET, segments[1]);
    }
  }

  // 用户的文献库列表
  if (segments[0] === 'users' && segments[2] === 'libraries') {
    return handleGetLibraries(request, segments[1]);
  }

  // ========================================
  // 统计路由 (管理员)
  // ========================================
  if (segments[0] === 'stats' && request.method === 'GET') {
    return handleGetStats(request, JWT_SECRET);
  }

  // ========================================
  // 健康检查
  // ========================================
  if (path === '/hello' || path === '/hello/') {
    return success({ message: "Joan's Academic Hub API", version: '6.0.0', kv: 'connected' }, 'Success', request);
  }

  // 其他路由返回 404
  return notFound('Not found', request);
}