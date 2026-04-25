/**
 * 项目列表 API
 * GET /api/projects - 获取项目列表
 * POST /api/projects - 创建项目
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvListAdd } from '../../../lib/kv.js';
import { success, error, unauthorized, parseJsonBody } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

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

    // 获取项目列表
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const { userId } = auth.user;
        const projectIds = await kvGetJson(`projects:by-user:${userId}`) || [];
        const projects = [];

        for (const projId of projectIds) {
          const project = await kvGetJson(`projects:${projId}`);
          if (project) {
            projects.push(project);
          }
        }

        // 排序
        projects.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        return success(projects);
      } catch (e) {
        console.error('[Projects/GET] Error:', e);
        return error('Failed to get projects', 500);
      }
    }

    // 创建项目
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
        const projectId = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const project = {
          id: projectId,
          name: body.name || body.title || 'New Project',
          title: body.title || body.name,
          description: body.description || '',
          progress: 0,
          status: body.status || 'in-progress',
          goalCount: body.goalCount || 0,
          completedGoals: body.completedGoals || 0,
          startDate: body.startDate || now.split('T')[0],
          targetDate: body.targetDate || '',
          paperIds: body.paperIds || [],
          objectives: body.objectives || [],
          tags: body.tags || [],
          notes: body.notes || '',
          createdAt: now,
          userId
        };

        await kvSet(`projects:${projectId}`, project);
        await kvListAdd(`projects:by-user:${userId}`, projectId);

        return success(project, 'Project created');
      } catch (e) {
        console.error('[Projects/POST] Error:', e);
        return error('Failed to create project', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
