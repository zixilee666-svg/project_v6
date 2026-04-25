/**
 * 项目详情 API
 * GET /api/projects/:id - 获取项目详情
 * PUT /api/projects/:id - 更新项目
 * DELETE /api/projects/:id - 删除项目
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvListRemove } from '../../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];

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

    // 获取项目详情
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const project = await kvGetJson(`projects:${projectId}`);
        if (!project) {
          return notFound('Project not found');
        }

        return success(project);
      } catch (e) {
        console.error('[Project/GET] Error:', e);
        return error('Failed to get project', 500);
      }
    }

    // 更新项目
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

        const project = await kvGetJson(`projects:${projectId}`);
        if (!project) {
          return notFound('Project not found');
        }

        const updatedProject = {
          ...project,
          ...body,
          id: project.id,
          userId: project.userId,
          createdAt: project.createdAt
        };

        await kvSet(`projects:${projectId}`, updatedProject);
        return success(updatedProject, 'Project updated');
      } catch (e) {
        console.error('[Project/PUT] Error:', e);
        return error('Failed to update project', 500);
      }
    }

    // 删除项目
    if (request.method === 'DELETE') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const project = await kvGetJson(`projects:${projectId}`);
        if (!project) {
          return notFound('Project not found');
        }

        const { userId } = auth.user;
        if (project.userId !== userId) {
          return unauthorized('Not authorized');
        }

        await kvSet(`projects:${projectId}`, null);
        await kvListRemove(`projects:by-user:${userId}`, projectId);

        return success(null, 'Project deleted');
      } catch (e) {
        console.error('[Project/DELETE] Error:', e);
        return error('Failed to delete project', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
