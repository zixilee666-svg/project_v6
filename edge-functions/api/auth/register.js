/**
 * 用户注册 API
 * POST /api/auth/register
 */
import { createToken } from '../../lib/jwt.js';
import { kvGet, kvSet, kvGetJson } from '../../lib/kv.js';
import { success, error, parseJsonBody } from '../../lib/cors.js';

// SHA-256 密码哈希
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':joan_academic_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return error('Method not allowed', 405);
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return error('Invalid request body', 400);
    }

    const { username, password, email, institution } = body;

    if (!username || !password) {
      return error('Username and password are required', 400);
    }

    if (username.length < 3 || username.length > 20) {
      return error('Username must be 3-20 characters', 400);
    }

    if (password.length < 6) {
      return error('Password must be at least 6 characters', 400);
    }

    try {
      // 检查用户名是否已存在
      const existingUserId = await kvGet(`users:by-username:${username}`);
      if (existingUserId) {
        return error('Username already exists', 409);
      }

      // 创建新用户
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const user = {
        id: userId,
        username,
        email: email || '',
        institution: institution || '',
        displayName: username,
        role: 'user',
        createdAt: now
      };

      // 存储用户（密码使用 SHA-256 哈希）
      const passwordHash = await hashPassword(password);
      const userWithPassword = { ...user, passwordHash };
      await kvSet(`users:${userId}`, userWithPassword);
      
      // 建立用户名索引
      await kvSet(`users:by-username:${username}`, userId);

      // 初始化用户数据
      await kvSet(`papers:by-user:${userId}`, []);
      await kvSet(`libraries:by-user:${userId}`, []);
      await kvSet(`projects:by-user:${userId}`, []);
      await kvSet(`materials:by-user:${userId}`, []);

      // 创建默认文献库
      const defaultLibrary = {
        id: `lib-${userId}-default`,
        name: '我的文献库',
        description: '默认文献库',
        color: '#3d5a80',
        icon: 'Library',
        paperIds: [],
        createdAt: now,
        isDefault: true,
        userId
      };
      await kvSet(`libraries:${defaultLibrary.id}`, defaultLibrary);
      
      const userLibraries = await kvGetJson(`libraries:by-user:${userId}`) || [];
      userLibraries.push(defaultLibrary.id);
      await kvSet(`libraries:by-user:${userId}`, userLibraries);

      // 生成 Token
      const token = await createToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      return success({ token, user }, 'Registration successful');
    } catch (e) {
      console.error('[Auth/Register] Error:', e);
      return error('Registration failed', 500);
    }
  }
};
