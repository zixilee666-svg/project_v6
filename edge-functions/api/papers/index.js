/**
 * 论文列表 API
 * GET /api/papers - 获取论文列表
 * POST /api/papers - 创建论文
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvListAdd } from '../../../lib/kv.js';
import { success, error, unauthorized, parseJsonBody } from '../../../lib/cors.js';

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

    // 获取论文列表
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const { userId } = auth.user;
        const search = url.searchParams.get('search');
        const tag = url.searchParams.get('tag');
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

        // 获取用户的所有论文
        const paperIds = await kvGetJson(`papers:by-user:${userId}`) || [];
        const papers = [];

        for (const paperId of paperIds) {
          const paper = await kvGetJson(`papers:${paperId}`);
          if (paper) {
            papers.push(paper);
          }
        }

        // 搜索过滤
        let filtered = papers;
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(p => 
            p.title?.toLowerCase().includes(q) ||
            p.authors?.some(a => a.toLowerCase().includes(q)) ||
            p.keywords?.some(k => k.toLowerCase().includes(q)) ||
            p.abstract?.toLowerCase().includes(q)
          );
        }

        // 标签过滤
        if (tag) {
          filtered = filtered.filter(p => 
            p.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))
          );
        }

        // 排序（按添加时间倒序）
        filtered.sort((a, b) => 
          new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
        );

        // 分页
        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);

        return success({
          papers: paginated,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        });
      } catch (e) {
        console.error('[Papers/GET] Error:', e);
        return error('Failed to get papers', 500);
      }
    }

    // 创建论文
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
        const paperId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const paper = {
          id: paperId,
          title: body.title || 'Untitled',
          authors: body.authors || [],
          year: body.year || new Date().getFullYear(),
          venue: body.venue || '',
          venueType: body.venueType || 'preprint',
          volume: body.volume,
          issue: body.issue,
          pages: body.pages,
          doi: body.doi,
          abstract: body.abstract || '',
          keywords: body.keywords || [],
          tags: body.tags || [],
          pdfUrl: body.pdfUrl,
          url: body.url,
          citationCount: body.citationCount || 0,
          isFavorited: false,
          isRead: false,
          readingStatus: 'unread',
          addedAt: now,
          userId
        };

        // 存储论文
        await kvSet(`papers:${paperId}`, paper);
        
        // 添加到用户的论文列表
        await kvListAdd(`papers:by-user:${userId}`, paperId);

        return success(paper, 'Paper created');
      } catch (e) {
        console.error('[Papers/POST] Error:', e);
        return error('Failed to create paper', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
