/**
 * 公开空间列表 API
 * GET /api/spaces - 获取公开空间列表（无需认证）
 * 支持搜索、领域过滤、排序、分页
 */
import { kvGetJson } from '../../lib/kv.js';
import { success, error } from '../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 获取公开空间列表（无需认证）
    if (request.method === 'GET') {
      try {
        const search = url.searchParams.get('search')?.toLowerCase();
        const field = url.searchParams.get('field');
        const sort = url.searchParams.get('sort') || 'recent';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // 获取所有用户名
        const usernames = await kvGetJson('spaces:index') || [];
        let spaces = [];

        for (const username of usernames) {
          const user = await kvGetJson(`users:${username}`) || await kvGetJson(`users:by-username:${username}`);
          if (!user) continue;

          // 只显示公开空间
          if (user.isPublic === false) continue;

          const paperCount = (await kvGetJson(`papers:by-user:${user.userId}`))?.length || 0;
          const projectCount = (await kvGetJson(`projects:by-user:${user.userId}`))?.length || 0;

          const spaceProfile = {
            username: user.username,
            displayName: user.displayName || user.username,
            avatar: user.avatar || '',
            bio: user.bio || '',
            field: user.field || '',
            organization: user.organization || '',
            paperCount,
            projectCount,
            viewCount: user.viewCount || 0,
            createdAt: user.createdAt
          };

          // 搜索过滤
          if (search) {
            const nameMatch = spaceProfile.displayName.toLowerCase().includes(search);
            const bioMatch = spaceProfile.bio.toLowerCase().includes(search);
            const fieldMatch = spaceProfile.field.toLowerCase().includes(search);
            if (!nameMatch && !bioMatch && !fieldMatch) continue;
          }

          // 领域过滤
          if (field && spaceProfile.field !== field) continue;

          spaces.push(spaceProfile);
        }

        // 排序
        if (sort === 'popular') {
          spaces.sort((a, b) => b.viewCount - a.viewCount);
        } else if (sort === 'papers') {
          spaces.sort((a, b) => b.paperCount - a.paperCount);
        } else {
          // recent
          spaces.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // 分页
        const total = spaces.length;
        const paginatedSpaces = spaces.slice(offset, offset + limit);

        return success({
          spaces: paginatedSpaces,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (e) {
        console.error('[Spaces/GET] Error:', e);
        return error('Failed to get spaces', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
