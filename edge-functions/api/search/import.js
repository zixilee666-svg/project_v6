/**
 * 搜索结果导入 API
 * POST /api/search/import - 将搜索结果导入为论文
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { kvGetJson, kvSet, kvListAdd } from '../../lib/kv.js';
import { success, error, unauthorized, parseJsonBody } from '../../lib/cors.js';

function generateId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  async fetch(request) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 导入论文
    if (request.method === 'POST') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }
        const { userId } = auth.user;

        const body = await parseJsonBody(request);
        if (!body) {
          return error('Invalid request body', 400);
        }

        // 必填字段验证
        const title = body.title;
        if (!title) {
          return error('title is required', 400);
        }

        // 生成论文ID
        const paperId = generateId('paper');

        // 构建论文对象
        const paper = {
          id: paperId,
          userId,
          title,
          authors: body.authors || '',
          year: body.year || null,
          abstract: body.abstract || '',
          journal: body.journal || '',
          volume: body.volume || '',
          issue: body.issue || '',
          pages: body.pages || '',
          doi: body.doi || '',
          url: body.url || body.doi ? `https://doi.org/${body.doi}` : '',
          source: body.source || 'import',
          sourceId: body.sourceId || body.doi || '',
          tags: body.tags || [],
          notes: body.notes || '',
          isFavorited: false,
          readingStatus: 'unread',
          readingProgress: 0,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 保存论文
        await kvSet(`papers:${paperId}`, paper);
        await kvListAdd(`papers:by-user:${userId}`, paperId);

        return success(paper, 'Paper imported', 201);
      } catch (e) {
        console.error('[Import] Error:', e);
        return error('Failed to import paper', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
