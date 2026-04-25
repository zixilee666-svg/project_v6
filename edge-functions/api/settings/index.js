/**
 * 用户设置 API
 * GET /api/settings - 获取设置
 * PUT /api/settings - 更新设置
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet } from '../../../lib/kv.js';
import { success, error, unauthorized, parseJsonBody } from '../../../lib/cors.js';

const DEFAULT_SETTINGS = {
  theme: 'system',
  citationFormat: 'ieee',
  language: 'zh-CN',
  autoSave: true,
  notifications: {
    email: false,
    push: false,
    weekly: true,
    newPapers: true,
    readingReminders: true,
    projectUpdates: true,
    pointsChange: false
  }
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 获取设置
    if (request.method === 'GET') {
      try {
        const auth = await authenticateRequest(request);
        if (!auth.authenticated) {
          return unauthorized(auth.error);
        }

        const { userId } = auth.user;
        const settings = await kvGetJson(`settings:${userId}`);

        return success(settings || DEFAULT_SETTINGS);
      } catch (e) {
        console.error('[Settings/GET] Error:', e);
        return error('Failed to get settings', 500);
      }
    }

    // 更新设置
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

        const { userId } = auth.user;
        const currentSettings = await kvGetJson(`settings:${userId}`) || DEFAULT_SETTINGS;
        
        const updatedSettings = {
          ...currentSettings,
          ...body,
          notifications: {
            ...currentSettings.notifications,
            ...(body.notifications || {})
          }
        };

        await kvSet(`settings:${userId}`, updatedSettings);
        return success(updatedSettings, 'Settings updated');
      } catch (e) {
        console.error('[Settings/PUT] Error:', e);
        return error('Failed to update settings', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
