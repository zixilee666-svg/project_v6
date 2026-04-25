/**
 * 获取当前用户 API
 * GET /api/auth/me
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { kvGetJson } from '../../lib/kv.js';
import { success, error, unauthorized } from '../../lib/cors.js';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }

      const { userId } = auth.user;
      const user = await kvGetJson(`users:${userId}`);
      
      if (!user) {
        return unauthorized('User not found');
      }

      // 移除敏感信息
      const safeUser = { ...user };
      delete safeUser.passwordHash;

      return success(safeUser);
    } catch (e) {
      console.error('[Auth/Me] Error:', e);
      return error('Failed to get user', 500);
    }
  }
};
