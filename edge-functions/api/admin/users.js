/**
 * 用户管理 API（管理员）
 * GET /api/admin/users - 获取所有用户列表（支持搜索和分页）
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

    // 获取用户列表（需要管理员权限）
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

        const search = url.searchParams.get('search')?.toLowerCase();
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // 获取所有用户ID
        const userIds = await kvGetJson('users:index') || [];
        let users = [];

        for (const userId of userIds) {
          const user = await kvGetJson(`users:${userId}`);
          if (!user) continue;

          // 搜索过滤
          if (search) {
            const usernameMatch = user.username?.toLowerCase().includes(search);
            const displayNameMatch = user.displayName?.toLowerCase().includes(search);
            const emailMatch = user.email?.toLowerCase().includes(search);
            if (!usernameMatch && !displayNameMatch && !emailMatch) continue;
          }

          // 返回精简信息
          users.push({
            userId: user.userId,
            username: user.username,
            displayName: user.displayName || user.username,
            email: user.email,
            role: user.role || 'user',
            isActive: user.isActive !== false,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin || null
          });
        }

        // 按创建时间倒序排序
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 分页
        const total = users.length;
        const paginatedUsers = users.slice(offset, offset + limit);

        return success({
          users: paginatedUsers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (e) {
        console.error('[Admin/Users] Error:', e);
        return error('Failed to get users', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
