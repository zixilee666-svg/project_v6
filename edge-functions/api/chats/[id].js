/**
 * 对话详情 API
 * GET /api/chats/:id - 获取对话详情
 * PUT /api/chats/:id - 更新对话（标题和消息）
 * DELETE /api/chats/:id - 删除对话
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson, kvSet, kvDel, kvListRemove } from '../../../lib/kv.js';
import { success, error, unauthorized, notFound, parseJsonBody } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

      // 获取对话详情
      if (request.method === 'GET') {
        try {
          const chat = await kvGetJson(`chats:${id}`);
          if (!chat) {
            return notFound('Chat not found');
          }
          if (chat.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }
          return success(chat);
        } catch (e) {
          console.error('[Chat/GET] Error:', e);
          return error('Failed to get chat', 500);
        }
      }

      // 更新对话
      if (request.method === 'PUT') {
        try {
          const body = await parseJsonBody(request);
          if (!body) {
            return error('Invalid request body', 400);
          }

          const chat = await kvGetJson(`chats:${id}`);
          if (!chat) {
            return notFound('Chat not found');
          }
          if (chat.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          // 更新标题和消息
          const updated = {
            ...chat,
            title: body.title !== undefined ? body.title : chat.title,
            messages: body.messages !== undefined ? body.messages : chat.messages,
            updatedAt: new Date().toISOString()
          };

          await kvSet(`chats:${id}`, updated);
          return success(updated, 'Chat updated');
        } catch (e) {
          console.error('[Chat/PUT] Error:', e);
          return error('Failed to update chat', 500);
        }
      }

      // 删除对话
      if (request.method === 'DELETE') {
        try {
          const chat = await kvGetJson(`chats:${id}`);
          if (!chat) {
            return notFound('Chat not found');
          }
          if (chat.userId !== userId) {
            return error('Access denied', 403, 'FORBIDDEN');
          }

          await kvDel(`chats:${id}`);
          await kvListRemove(`chats:by-user:${userId}`, id);

          return success(null, 'Chat deleted');
        } catch (e) {
          console.error('[Chat/DELETE] Error:', e);
          return error('Failed to delete chat', 500);
        }
      }

      return error('Method not allowed', 405);
    } catch (e) {
      console.error('[Chat] Error:', e);
      return error('Internal error', 500);
    }
  }
};
