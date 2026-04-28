/**
 * 对话列表 API
 * GET /api/chats - 获取用户对话列表
 * POST /api/chats - 创建新对话
 */
import { authenticateRequest } from '../../lib/jwt.js';
import { kvGetJson, kvSet, kvListAdd } from '../../lib/kv.js';
import { success, error, unauthorized, parseJsonBody } from '../../lib/cors.js';

function generateId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }
      const { userId } = auth.user;

      // 获取对话列表
      if (request.method === 'GET') {
        try {
          const chatIds = await kvGetJson(`chats:by-user:${userId}`) || [];
          const chats = [];

          for (const id of chatIds) {
            const chat = await kvGetJson(`chats:${id}`);
            if (chat) {
              chats.push(chat);
            }
          }

          // 按更新时间倒序排序
          chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

          return success({ chats });
        } catch (e) {
          console.error('[Chats/GET] Error:', e);
          return error('Failed to get chats', 500);
        }
      }

      // 创建新对话
      if (request.method === 'POST') {
        try {
          const body = await parseJsonBody(request);
          const id = generateId('chat');

          const chat = {
            id,
            userId,
            title: body?.title || 'New Conversation',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await kvSet(`chats:${id}`, chat);
          await kvListAdd(`chats:by-user:${userId}`, id);

          return success(chat, 'Chat created', 201);
        } catch (e) {
          console.error('[Chats/POST] Error:', e);
          return error('Failed to create chat', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Chats] Error:', e);
      return error('Internal error', 500);
    }
  }
};
