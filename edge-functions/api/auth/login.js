/**
 * 用户登录 API
 * POST /api/auth/login
 */
import { createToken } from '../../lib/jwt.js';
import { kvGetJson, kvGet } from '../../lib/kv.js';
import { json, success, error, unauthorized, parseJsonBody } from '../../lib/cors.js';

// SHA-256 密码哈希（与注册端保持一致）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':joan_academic_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 管理员凭证
const ADMIN_USERNAME = EdgeOne.env.get('ADMIN_USERNAME') || 'admin';
const ADMIN_PASSWORD = EdgeOne.env.get('ADMIN_PASSWORD') || '123456';

export default {
  async fetch(request) {
    // 处理 OPTIONS 预检请求
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

    const { username, password } = body;

    if (!username || !password) {
      return error('Username and password are required', 400);
    }

    try {
      let user = null;
      let token = null;

      // 检查是否为管理员登录
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        user = {
          id: 'admin-fixed',
          username: 'admin',
          displayName: 'Administrator',
          role: 'admin',
          institution: 'Joan Academic Hub',
          createdAt: new Date().toISOString()
        };
        token = await createToken({
          userId: user.id,
          username: user.username,
          role: user.role
        });
      } else {
        // 查找注册用户
        const userId = await kvGet(`users:by-username:${username}`);
        if (userId) {
          const storedUser = await kvGetJson(`users:${userId}`);
          const passwordHash = await hashPassword(password);
          if (storedUser && storedUser.passwordHash === passwordHash) {
            user = { ...storedUser };
            delete user.passwordHash;
            token = await createToken({
              userId: user.id,
              username: user.username,
              role: user.role
            });
          }
        }
      }

      if (!user || !token) {
        return unauthorized('Invalid username or password');
      }

      return success({ token, user }, 'Login successful');
    } catch (e) {
      console.error('[Auth/Login] Error:', e);
      return error('Login failed', 500);
    }
  }
};
