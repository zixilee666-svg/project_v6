/**
 * 论文详情 API
 * GET    /api/papers/:id           - 获取论文详情
 * PUT    /api/papers/:id           - 更新论文
 * DELETE /api/papers/:id           - 删除论文
 * POST   /api/papers/:id/favorite  - 切换收藏
 * GET    /api/papers/:id/notes     - 获取笔记列表
 * POST   /api/papers/:id/notes     - 添加笔记
 * DELETE /api/papers/:id/notes/:noteId - 删除笔记
 * GET    /api/papers/:id/highlights - 获取高亮标注列表
 * POST   /api/papers/:id/highlights - 添加高亮标注
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvListRemove } from '../../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody, handleCors } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean); // ['', 'api', 'papers', ':id', ...]
    const paperId = pathParts[3]; // /api/papers/:id
    const subPath = pathParts[4];  // notes, highlights, favorite
    const subId = pathParts[5];    // noteId for DELETE

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    // 认证检查（除 GET notes/highlights 可选认证外）
    const auth = await authenticateRequest(request);
    const requireAuth = request.method !== 'GET';

    // ---- Notes ----
    if (subPath === 'notes') {
      // GET /api/papers/:id/notes
      if (request.method === 'GET') {
        try {
          const notes = await kvGetJson(`notes:${paperId}`) || [];
          return success(notes);
        } catch (e) {
          console.error('[Paper/Notes/GET] Error:', e);
          return error('Failed to get notes', 500);
        }
      }

      // DELETE /api/papers/:id/notes/:noteId
      if (request.method === 'DELETE' && subId) {
        if (!auth.authenticated) return unauthorized(auth.error);
        try {
          const notes = await kvGetJson(`notes:${paperId}`) || [];
          const filtered = notes.filter(n => n.id !== subId);
          await kvSet(`notes:${paperId}`, filtered);
          return success(null, 'Note deleted');
        } catch (e) {
          console.error('[Paper/Notes/DELETE] Error:', e);
          return error('Failed to delete note', 500);
        }
      }

      // POST /api/papers/:id/notes
      if (request.method === 'POST') {
        if (!auth.authenticated) return unauthorized(auth.error);
        try {
          const body = await parseJsonBody(request);
          if (!body || !body.content) {
            return error('Note content is required', 400);
          }

          const now = new Date().toISOString();
          const note = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            paperId,
            content: body.content,
            createdAt: now,
            updatedAt: now,
          };

          const notes = await kvGetJson(`notes:${paperId}`) || [];
          notes.push(note);
          await kvSet(`notes:${paperId}`, notes);

          return success(note, 'Note added');
        } catch (e) {
          console.error('[Paper/Notes/POST] Error:', e);
          return error('Failed to add note', 500);
        }
      }

      return error('Method not allowed', 405);
    }

    // ---- Highlights ----
    if (subPath === 'highlights') {
      // GET /api/papers/:id/highlights
      if (request.method === 'GET') {
        try {
          const highlights = await kvGetJson(`highlights:${paperId}`) || [];
          return success(highlights);
        } catch (e) {
          console.error('[Paper/Highlights/GET] Error:', e);
          return error('Failed to get highlights', 500);
        }
      }

      // POST /api/papers/:id/highlights
      if (request.method === 'POST') {
        if (!auth.authenticated) return unauthorized(auth.error);
        try {
          const body = await parseJsonBody(request);
          if (!body || !body.text) {
            return error('Highlight text is required', 400);
          }

          const highlight = {
            id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            paperId,
            text: body.text,
            color: body.color || '#FFD700',
            note: body.note || '',
            page: body.page || null,
            createdAt: new Date().toISOString(),
          };

          const highlights = await kvGetJson(`highlights:${paperId}`) || [];
          highlights.push(highlight);
          await kvSet(`highlights:${paperId}`, highlights);

          return success(highlight, 'Highlight added');
        } catch (e) {
          console.error('[Paper/Highlights/POST] Error:', e);
          return error('Failed to add highlight', 500);
        }
      }

      return error('Method not allowed', 405);
    }

    // ---- Favorite ----
    if (subPath === 'favorite' && request.method === 'POST') {
      if (!auth.authenticated) return unauthorized(auth.error);
      try {
        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) return notFound('Paper not found');

        paper.isFavorited = !paper.isFavorited;
        await kvSet(`papers:${paperId}`, paper);

        return success({ isFavorited: paper.isFavorited }, 'Favorite toggled');
      } catch (e) {
        console.error('[Paper/Favorite] Error:', e);
        return error('Failed to toggle favorite', 500);
      }
    }

    // ---- Paper CRUD ----
    // GET /api/papers/:id
    if (request.method === 'GET') {
      try {
        if (!auth.authenticated) return unauthorized(auth.error);

        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) return notFound('Paper not found');

        // 附加 notes 和 highlights
        const notes = await kvGetJson(`notes:${paperId}`) || [];
        const highlights = await kvGetJson(`highlights:${paperId}`) || [];
        return success({ ...paper, notes, highlights });
      } catch (e) {
        console.error('[Paper/GET] Error:', e);
        return error('Failed to get paper', 500);
      }
    }

    // PUT /api/papers/:id
    if (request.method === 'PUT') {
      if (!auth.authenticated) return unauthorized(auth.error);
      try {
        const body = await parseJsonBody(request);
        if (!body) return error('Invalid request body', 400);

        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) return notFound('Paper not found');

        const updatedPaper = {
          ...paper,
          ...body,
          id: paper.id,
          userId: paper.userId,
          addedAt: paper.addedAt,
        };

        await kvSet(`papers:${paperId}`, updatedPaper);
        return success(updatedPaper, 'Paper updated');
      } catch (e) {
        console.error('[Paper/PUT] Error:', e);
        return error('Failed to update paper', 500);
      }
    }

    // DELETE /api/papers/:id
    if (request.method === 'DELETE') {
      if (!auth.authenticated) return unauthorized(auth.error);
      try {
        const paper = await kvGetJson(`papers:${paperId}`);
        if (!paper) return notFound('Paper not found');

        if (paper.userId !== auth.user.userId) {
          return unauthorized('Not authorized to delete this paper');
        }

        await kvSet(`papers:${paperId}`, null);
        await kvSet(`notes:${paperId}`, null);
        await kvSet(`highlights:${paperId}`, null);
        await kvListRemove(`papers:by-user:${auth.user.userId}`, paperId);

        return success(null, 'Paper deleted');
      } catch (e) {
        console.error('[Paper/DELETE] Error:', e);
        return error('Failed to delete paper', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
