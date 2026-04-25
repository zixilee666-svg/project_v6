/**
 * 用户登出 API
 * POST /api/auth/logout
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { success, error, unauthorized } from '../../lib/cors.js';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (request.method !== 'POST') {
      return error('Method not allowed', 405);
    }

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }

      // JWT 无状态，登出只需要客户端删除 Token
      // 如果需要黑名单机制，可以在这里添加
      return success(null, 'Logout successful');
    } catch (e) {
      console.error('[Auth/Logout] Error:', e);
      return error('Logout failed', 500);
    }
  }
};
