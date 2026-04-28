/**
 * 公开空间详情 API
 * GET /api/spaces/:username - 获取用户空间资料（无需认证）
 * POST /api/spaces/:username/view - 记录访客浏览（需要认证）
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet } from '../../../lib/kv.js';
import { success, error, unauthorized, notFound } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const username = pathParts[2];

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 获取空间详情（无需认证）
    if (request.method === 'GET') {
      try {
        // 按用户名查找用户
        const userId = await kvGetJson(`users:by-username:${username}`);
        if (!userId) {
          return notFound('User not found');
        }

        const user = await kvGetJson(`users:${userId}`);
        if (!user) {
          return notFound('User not found');
        }

        // 检查是否公开
        if (user.isPublic === false) {
          return error('This space is private', 403, 'FORBIDDEN');
        }

        // 获取统计数据
        const papers = await kvGetJson(`papers:by-user:${user.userId}`) || [];
        const projects = await kvGetJson(`projects:by-user:${user.userId}`) || [];

        const spaceProfile = {
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar || '',
          bio: user.bio || '',
          field: user.field || '',
          organization: user.organization || '',
          paperCount: papers.length,
          projectCount: projects.length,
          viewCount: user.viewCount || 0,
          createdAt: user.createdAt
        };

        return success(spaceProfile);
      } catch (e) {
        console.error('[Space/GET] Error:', e);
        return error('Failed to get space profile', 500);
      }
    }

    // 记录浏览（需要认证）
    if (request.method === 'POST' && url.pathname.endsWith('/view')) {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const userId = await kvGetJson(`users:by-username:${username}`);
        if (!userId) {
          return notFound('User not found');
        }

        const user = await kvGetJson(`users:${userId}`);
        if (!user) {
          return notFound('User not found');
        }

        // 增加浏览计数
        user.viewCount = (user.viewCount || 0) + 1;
        await kvSet(`users:${userId}`, user);

        return success({ viewCount: user.viewCount }, 'View recorded');
      } catch (e) {
        console.error('[Space/View] Error:', e);
        return error('Failed to record view', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
