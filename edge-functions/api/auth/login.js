/**
 * 用户登录 API
 * POST /api/auth/login
 */
import { createToken } from '../../lib/jwt.js';
import { kvGetJson, kvGet } from '../../lib/kv.js';
import { json, success, error, unauthorized, parseJsonBody, handleCors } from '../../lib/cors.js';
import { verifyPassword, hashPassword } from '../../lib/crypto.js';

// 管理员凭证
const ADMIN_USERNAME = EdgeOne.env.get('ADMIN_USERNAME') || 'admin';
const ADMIN_PASSWORD = EdgeOne.env.get('ADMIN_PASSWORD') || '123456';

export default {
  async fetch(request) {
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCors(request);
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
          if (storedUser) {
            const isValid = await verifyPassword(
              password,
              storedUser.passwordHash,
              storedUser.passwordSalt,
              storedUser.passwordIterations
            );
            if (isValid) {
              user = { ...storedUser };
              delete user.passwordHash;
              delete user.passwordSalt;
              delete user.passwordIterations;
              token = await createToken({
                userId: user.id,
                username: user.username,
                role: user.role
              });
            }
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
