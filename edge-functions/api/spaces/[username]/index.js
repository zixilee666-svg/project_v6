/**
 * 学术空间详情 API
 * GET /api/spaces/:username - 获取公开空间详情
 * POST /api/spaces/:username/view - 记录浏览（需认证）
 * GET /api/spaces/:username/theme - 获取空间主题
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet } from '../../../lib/kv.js';
import { success, error, notFound, unauthorized } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    }

    try {
      // Extract username from path: /api/spaces/:username or /api/spaces/:username/theme or /api/spaces/:username/view
      const username = pathParts[3];
      const subPath = pathParts[4]; // 'theme' or 'view' or undefined

      if (!username) {
        return error('Username is required', 400);
      }

      // Get user by username
      const userId = await kvGetJson(`users:by-username:${username}`);
      if (!userId) return notFound('User not found');

      const user = await kvGetJson(`users:${userId}`);
      if (!user) return notFound('User not found');

      const spaceConfig = await kvGetJson(`spaces:${username}`) || {};

      // GET /api/spaces/:username - Public profile
      if (request.method === 'GET' && !subPath) {
        const paperIds = await kvGetJson(`papers:by-user:${userId}`) || [];
        const projectIds = await kvGetJson(`projects:by-user:${userId}`) || [];
        const libraryIds = await kvGetJson(`libraries:by-user:${userId}`) || [];

        // Get public papers
        const papers = [];
        for (const pid of paperIds.slice(0, 20)) {
          const paper = await kvGetJson(`papers:${pid}`);
          if (paper) papers.push(paper);
        }

        // Get public projects
        const projects = [];
        for (const pid of projectIds.slice(0, 10)) {
          const project = await kvGetJson(`projects:${pid}`);
          if (project) projects.push(project);
        }

        return success({
          username: user.username,
          displayName: user.displayName || user.username,
          institution: user.institution || '',
          researchField: user.researchField || '',
          avatar: user.avatar || null,
          bio: spaceConfig.bio || '',
          isPublic: spaceConfig.isPublic !== false,
          paperCount: paperIds.length,
          projectCount: projectIds.length,
          libraryCount: libraryIds.length,
          viewCount: spaceConfig.viewCount || 0,
          popularity: spaceConfig.popularity || 0,
          lastActiveAt: spaceConfig.lastActiveAt || user.createdAt || '',
          createdAt: user.createdAt || '',
          theme: spaceConfig.theme || null,
          papers: papers,
          projects: projects,
        });
      }

      // GET /api/spaces/:username/theme - Get theme config
      if (request.method === 'GET' && subPath === 'theme') {
        return success({
          username,
          theme: spaceConfig.theme || {
            primaryColor: '#3d5a80',
            accentColor: '#d4863c',
            layout: 'classic',
            showPapers: true,
            showProjects: true,
            showStats: true,
          },
        });
      }

      // POST /api/spaces/:username/view - Record view
      if (request.method === 'POST' && subPath === 'view') {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) return unauthorized(auth.error);

        const views = (spaceConfig.viewCount || 0) + 1;
        const popularity = (spaceConfig.popularity || 0) + 1;
        await kvSet(`spaces:${username}`, {
          ...spaceConfig,
          viewCount: views,
          popularity,
          lastActiveAt: new Date().toISOString(),
        });

        return success({ viewCount: views, popularity });
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Spaces/:username] Error:', e);
      return error('Internal error', 500);
    }
  }
};
