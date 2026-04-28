/**
 * 资料详情 API
 * GET /api/materials/:id - 获取资料详情
 * PUT /api/materials/:id - 更新资料
 * DELETE /api/materials/:id - 删除资料
 * POST /api/materials/:id/favorite - 切换收藏
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
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

      // 获取资料详情
      if (request.method === 'GET') {
        try {
          const material = await kvGetJson(`materials:${id}`);
          if (!material) {
            return notFound('Material not found');
          }
          if (material.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }
          return success(material);
        } catch (e) {
          console.error('[Material/GET] Error:', e);
          return error('Failed to get material', 500);
        }
      }

      // 更新资料
      if (request.method === 'PUT') {
        try {
          const body = await parseJsonBody(request);
          if (!body) {
            return error('Invalid request body', 400);
          }

          const material = await kvGetJson(`materials:${id}`);
          if (!material) {
            return notFound('Material not found');
          }
          if (material.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          const updated = {
            ...material,
            ...body,
            id,
            userId,
            updatedAt: new Date().toISOString()
          };

          await kvSet(`materials:${id}`, updated);
          return success(updated, 'Material updated');
        } catch (e) {
          console.error('[Material/PUT] Error:', e);
          return error('Failed to update material', 500);
        }
      }

      // 删除资料
      if (request.method === 'DELETE') {
        try {
          const material = await kvGetJson(`materials:${id}`);
          if (!material) {
            return notFound('Material not found');
          }
          if (material.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          await kvDel(`materials:${id}`);
          await kvListRemove(`materials:by-user:${userId}`, id);

          return success(null, 'Material deleted');
        } catch (e) {
          console.error('[Material/DELETE] Error:', e);
          return error('Failed to delete material', 500);
        }
      }

      // 切换收藏
      if (request.method === 'POST' && url.pathname.endsWith('/favorite')) {
        try {
          const material = await kvGetJson(`materials:${id}`);
          if (!material) {
            return notFound('Material not found');
          }
          if (material.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          material.isFavorite = !material.isFavorite;
          material.updatedAt = new Date().toISOString();
          await kvSet(`materials:${id}`, material);

          return success({ isFavorite: material.isFavorite }, 'Favorite toggled');
        } catch (e) {
          console.error('[Material/Favorite] Error:', e);
          return error('Failed to toggle favorite', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Material] Error:', e);
      return error('Internal error', 500);
    }
  }
};
