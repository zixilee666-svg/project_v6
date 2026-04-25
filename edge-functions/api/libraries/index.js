/**
 * 文献库列表 API
 * GET /api/libraries - 获取文献库列表
 * POST /api/libraries - 创建文献库
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvListAdd } from '../../../lib/kv.js';
import { success, error, unauthorized, parseJsonBody } from '../../../lib/cors.js';

export default {
  async fetch(request) {
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

    // 获取文献库列表
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const { userId } = auth.user;
        const libIds = await kvGetJson(`libraries:by-user:${userId}`) || [];
        const libraries = [];

        for (const libId of libIds) {
          const lib = await kvGetJson(`libraries:${libId}`);
          if (lib) {
            libraries.push(lib);
          }
        }

        // 排序（默认库在前）
        libraries.sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });

        return success(libraries);
      } catch (e) {
        console.error('[Libraries/GET] Error:', e);
        return error('Failed to get libraries', 500);
      }
    }

    // 创建文献库
    if (request.method === 'POST') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const body = await parseJsonBody(request);
        if (!body) {
          return error('Invalid request body', 400);
        }

        const { userId } = auth.user;
        const libId = `lib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const library = {
          id: libId,
          name: body.name || '新文献库',
          description: body.description || '',
          color: body.color || '#3d5a80',
          icon: body.icon || 'Folder',
          paperIds: body.paperIds || [],
          createdAt: now,
          isDefault: false,
          userId
        };

        await kvSet(`libraries:${libId}`, library);
        await kvListAdd(`libraries:by-user:${userId}`, libId);

        return success(library, 'Library created');
      } catch (e) {
        console.error('[Libraries/POST] Error:', e);
        return error('Failed to create library', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
