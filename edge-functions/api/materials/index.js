/**
 * 资料列表 API
 * GET /api/materials - 获取资料列表（支持搜索和分类过滤）
 * POST /api/materials - 创建新资料
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { kvGetJson, kvSet, kvListAdd } from '../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody } from '../../lib/cors.js';

function generateId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

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

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }
      const { userId } = auth.user;

      // 获取资料列表
      if (request.method === 'GET') {
        try {
          const materialIds = await kvGetJson(`materials:by-user:${userId}`) || [];
          const search = url.searchParams.get('search')?.toLowerCase();
          const category = url.searchParams.get('category');
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const offset = (page - 1) * limit;

          const materials = [];
          for (const id of materialIds) {
            const material = await kvGetJson(`materials:${id}`);
            if (material) {
              // 搜索过滤
              if (search) {
                const titleMatch = material.title?.toLowerCase().includes(search);
                const descMatch = material.description?.toLowerCase().includes(search);
                if (!titleMatch && !descMatch) continue;
              }
              // 分类过滤
              if (category && material.category !== category) continue;

              materials.push(material);
            }
          }

          // 排序（按创建时间倒序）
          materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          // 分页
          const total = materials.length;
          const paginatedMaterials = materials.slice(offset, offset + limit);

          return success({
            materials: paginatedMaterials,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          });
        } catch (e) {
          console.error('[Materials/GET] Error:', e);
          return error('Failed to get materials', 500);
        }
      }

      // 创建资料
      if (request.method === 'POST') {
        try {
          const body = await parseJsonBody(request);
          if (!body) {
            return error('Invalid request body', 400);
          }

          const id = generateId('material');
          const material = {
            id,
            userId,
            title: body.title || 'Untitled',
            description: body.description || '',
            category: body.category || 'other',
            url: body.url || '',
            fileType: body.fileType || '',
            tags: body.tags || [],
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await kvSet(`materials:${id}`, material);
          await kvListAdd(`materials:by-user:${userId}`, id);

          return success(material, 'Material created', 201);
        } catch (e) {
          console.error('[Materials/POST] Error:', e);
          return error('Failed to create material', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Materials] Error:', e);
      return error('Internal error', 500);
    }
  }
};
