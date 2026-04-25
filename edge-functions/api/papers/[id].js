/**
 * 论文详情 API
 * GET /api/papers/:id - 获取论文详情
 * PUT /api/papers/:id - 更新论文
 * DELETE /api/papers/:id - 删除论文
 * POST /api/papers/:id/favorite - 切换收藏
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvListRemove } from '../../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const paperId = pathParts[pathParts.length - 1];

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

    // 获取论文详情
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) {
          return notFound('Paper not found');
        }

        return success(paper);
      } catch (e) {
        console.error('[Paper/GET] Error:', e);
        return error('Failed to get paper', 500);
      }
    }

    // 更新论文
    if (request.method === 'PUT') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const body = await parseJsonBody(request);
        if (!body) {
          return error('Invalid request body', 400);
        }

        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) {
          return notFound('Paper not found');
        }

        // 合并更新
        const updatedPaper = {
          ...paper,
          ...body,
          id: paper.id, // 防止 ID 被修改
          userId: paper.userId, // 防止 userId 被修改
          addedAt: paper.addedAt // 防止 addedAt 被修改
        };

        await kvSet(`papers:${paperId}`, updatedPaper);
        return success(updatedPaper, 'Paper updated');
      } catch (e) {
        console.error('[Paper/PUT] Error:', e);
        return error('Failed to update paper', 500);
      }
    }

    // 删除论文
    if (request.method === 'DELETE') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) {
          return notFound('Paper not found');
        }

        const { userId } = auth.user;

        // 验证所有权
        if (paper.userId !== userId) {
          return unauthorized('Not authorized to delete this paper');
        }

        // 删除论文
        await kvSet(`papers:${paperId}`, null);
        
        // 从用户列表移除
        await kvListRemove(`papers:by-user:${userId}`, paperId);

        return success(null, 'Paper deleted');
      } catch (e) {
        console.error('[Paper/DELETE] Error:', e);
        return error('Failed to delete paper', 500);
      }
    }

    // 切换收藏
    if (request.method === 'POST' && url.pathname.endsWith('/favorite')) {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) {
          return notFound('Paper not found');
        }

        paper.isFavorited = !paper.isFavorited;
        await kvSet(`papers:${paperId}`, paper);

        return success({ isFavorited: paper.isFavorited }, 'Favorite toggled');
      } catch (e) {
        console.error('[Paper/POST] Error:', e);
        return error('Failed to toggle favorite', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
