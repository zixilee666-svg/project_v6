/**
 * 用户详情管理 API（管理员）
 * GET /api/admin/users/:id - 获取用户详情
 * PUT /api/admin/users/:id - 更新用户状态
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet } from '../../../lib/kv.js';
import { success, error, unauthorized, forbidden, notFound, parseJsonBody } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }

      // 检查管理员权限
      if (auth.user.role !== 'admin') {
        return forbidden('Admin access required');
      }

      // 获取用户详情
      if (request.method === 'GET') {
        try {
          const user = await kvGetJson(`users:${id}`);
          if (!user) {
            return notFound('User not found');
          }

          // 返回完整信息
          const papers = await kvGetJson(`papers:by-user:${id}`) || [];
          const projects = await kvGetJson(`projects:by-user:${id}`) || [];
          const materials = await kvGetJson(`materials:by-user:${id}`) || [];
          const chats = await kvGetJson(`chats:by-user:${id}`) || [];

          return success({
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            role: user.role || 'user',
            isActive: user.isActive !== false,
            bio: user.bio,
            field: user.field,
            organization: user.organization,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            stats: {
              paperCount: papers.length,
              projectCount: projects.length,
              materialCount: materials.length,
              chatCount: chats.length
            }
          });
        } catch (e) {
          console.error('[Admin/User/GET] Error:', e);
          return error('Failed to get user', 500);
        }
      }

      // 更新用户状态
      if (request.method === 'PUT') {
        try {
          const body = await parseJsonBody(request);
          if (!body) {
            return error('Invalid request body', 400);
          }

          const user = await kvGetJson(`users:${id}`);
          if (!user) {
            return notFound('User not found');
          }

          // 只允许更新特定字段
          const updated = {
            ...user,
            role: body.role !== undefined ? body.role : user.role,
            isActive: body.isActive !== undefined ? body.isActive : user.isActive,
            displayName: body.displayName !== undefined ? body.displayName : user.displayName,
            bio: body.bio !== undefined ? body.bio : user.bio,
            field: body.field !== undefined ? body.field : user.field,
            organization: body.organization !== undefined ? body.organization : user.organization,
            updatedAt: new Date().toISOString()
          };

          await kvSet(`users:${id}`, updated);

          // 记录操作日志
          const logs = await kvGetJson('admin:logs') || [];
          logs.unshift({
            id: `log-${Date.now()}`,
            adminId: auth.user.userId,
            action: 'UPDATE_USER',
            targetUserId: id,
            changes: body,
            timestamp: new Date().toISOString()
          });
          // 保留最近1000条日志
          if (logs.length > 1000) {
            logs.length = 1000;
          }
          await kvSet('admin:logs', logs);

          return success(updated, 'User updated');
        } catch (e) {
          console.error('[Admin/User/PUT] Error:', e);
          return error('Failed to update user', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Admin/User] Error:', e);
      return error('Internal error', 500);
    }
  }
};
