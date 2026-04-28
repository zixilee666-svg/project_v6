/**
 * 论文库详情 API
 * GET /api/libraries/:id - 获取论文库详情
 * PUT /api/libraries/:id - 更新论文库
 * DELETE /api/libraries/:id - 删除论文库
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvDel, kvListRemove } from '../../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody } from '../../../lib/cors.js';

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
          'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }
      const { userId } = auth.user;

      // 获取论文库详情
      if (request.method === 'GET') {
        try {
          const library = await kvGetJson(`libraries:${id}`);
          if (!library) {
            return notFound('Library not found');
          }
          if (library.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }
          return success(library);
        } catch (e) {
          console.error('[Library/GET] Error:', e);
          return error('Failed to get library', 500);
        }
      }

      // 更新论文库
      if (request.method === 'PUT') {
        try {
          const body = await parseJsonBody(request);
          if (!body) {
            return error('Invalid request body', 400);
          }

          const library = await kvGetJson(`libraries:${id}`);
          if (!library) {
            return notFound('Library not found');
          }
          if (library.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          // 合并更新
          const updated = {
            ...library,
            ...body,
            id,
            userId,
            updatedAt: new Date().toISOString()
          };

          await kvSet(`libraries:${id}`, updated);
          return success(updated, 'Library updated');
        } catch (e) {
          console.error('[Library/PUT] Error:', e);
          return error('Failed to update library', 500);
        }
      }

      // 删除论文库
      if (request.method === 'DELETE') {
        try {
          const library = await kvGetJson(`libraries:${id}`);
          if (!library) {
            return notFound('Library not found');
          }
          if (library.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          // 删除论文库
          await kvDel(`libraries:${id}`);

          // 从用户列表移除
          await kvListRemove(`libraries:by-user:${userId}`, id);

          return success(null, 'Library deleted');
        } catch (e) {
          console.error('[Library/DELETE] Error:', e);
          return error('Failed to delete library', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Library] Error:', e);
      return error('Internal error', 500);
    }
  }
};
