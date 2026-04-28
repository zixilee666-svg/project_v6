/**
 * 论文库论文管理 API
 * POST /api/libraries/:id/papers - 添加论文到论文库
 * DELETE /api/libraries/:id/papers/:paperId - 从论文库移除论文
 */
import { authenticateRequest } from '../../../../lib/jwt.js';
import { kvGetJson, kvSet } from '../../../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody } from '../../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // path: api, libraries, :id, papers, :paperId
    const libId = pathParts[2];
    const paperId = pathParts[4];

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

      const library = await kvGetJson(`libraries:${libId}`);
      if (!library) {
        return notFound('Library not found');
      }
      if (library.userId !== userId) {
        return error('Access denied', 403, 'FORBIDDEN');
      }

      // 添加论文到论文库
      if (request.method === 'POST') {
        try {
          const body = await parseJsonBody(request);
          const pid = body?.paperId;
          if (!pid) {
            return error('paperId is required', 400);
          }

          if (!library.paperIds) {
            library.paperIds = [];
          }

          if (!library.paperIds.includes(pid)) {
            library.paperIds.push(pid);
            library.updatedAt = new Date().toISOString();
            await kvSet(`libraries:${libId}`, library);
          }
          return success(library, 'Paper added to library');
        } catch (e) {
          console.error('[Library/Papers/POST] Error:', e);
          return error('Failed to add paper to library', 500);
        }
      }

      // 从论文库移除论文
      if (request.method === 'DELETE') {
        try {
          if (!paperId) {
            return error('paperId is required', 400);
          }

          if (!library.paperIds) {
            library.paperIds = [];
          }

          library.paperIds = library.paperIds.filter(id => id !== paperId);
          library.updatedAt = new Date().toISOString();
          await kvSet(`libraries:${libId}`, library);

          return success(library, 'Paper removed from library');
        } catch (e) {
          console.error('[Library/Papers/DELETE] Error:', e);
          return error('Failed to remove paper from library', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Library/Papers] Error:', e);
      return error('Internal error', 500);
    }
  }
};
