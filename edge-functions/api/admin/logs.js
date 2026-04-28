/**
 * 操作日志 API（管理员）
 * GET /api/admin/logs - 获取操作日志列表
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { kvGetJson } from '../../lib/kv.js';
import { success, error, unauthorized, forbidden } from '../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

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

    // 获取操作日志（需要管理员权限）
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

        const action = url.searchParams.get('action');
        const adminId = url.searchParams.get('adminId');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // 获取所有日志
        let logs = await kvGetJson('admin:logs') || [];

        // 过滤
        if (action) {
          logs = logs.filter(log => log.action === action);
        }
        if (adminId) {
          logs = logs.filter(log => log.adminId === adminId);
        }

        // 分页
        const total = logs.length;
        const paginatedLogs = logs.slice(offset, offset + limit);

        return success({
          logs: paginatedLogs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (e) {
        console.error('[Admin/Logs] Error:', e);
        return error('Failed to get logs', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
