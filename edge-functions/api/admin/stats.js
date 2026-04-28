/**
 * 系统统计 API（管理员）
 * GET /api/admin/stats - 获取系统统计数据
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { kvGetJson } from '../../lib/kv.js';
import { success, error, unauthorized, forbidden } from '../../lib/cors.js';

export default {
  async fetch(request) {
    // CORS 预检
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

    // 获取系统统计（需要管理员权限）
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        // 检查管理员权限
        if (auth.user.role !== 'admin') {
          return forbidden('Admin access required');
        }

        // 统计用户数
        const userIds = await kvGetJson('users:index') || [];
        const userCount = userIds.length;

        // 统计论文数
        let paperCount = 0;
        for (const userId of userIds) {
          const papers = await kvGetJson(`papers:by-user:${userId}`) || [];
          paperCount += papers.length;
        }

        // 统计项目数
        let projectCount = 0;
        for (const userId of userIds) {
          const projects = await kvGetJson(`projects:by-user:${userId}`) || [];
          projectCount += projects.length;
        }

        // 统计资料数
        let materialCount = 0;
        for (const userId of userIds) {
          const materials = await kvGetJson(`materials:by-user:${userId}`) || [];
          materialCount += materials.length;
        }

        // 系统健康状态
        const health = {
          status: 'healthy',
          uptime: process.uptime ? process.uptime() : 'N/A',
          timestamp: new Date().toISOString()
        };

        return success({
          stats: {
            userCount,
            paperCount,
            projectCount,
            materialCount
          },
          health
        });
      } catch (e) {
        console.error('[Admin/Stats] Error:', e);
        return error('Failed to get stats', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
