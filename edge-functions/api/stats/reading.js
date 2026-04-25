/**
 * 阅读统计 API
 * GET /api/stats/reading - 获取阅读统计
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { kvGetJson } from '../../../lib/kv.js';
import { success, error, unauthorized } from '../../../lib/cors.js';

export default {
  async fetch(request) {
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

    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    try {
      const auth = await authenticateRequest(request);
      if (!auth.authenticated) {
        return unauthorized(auth.error);
      }

      const { userId } = auth.user;
      
      // 获取用户的所有论文
      const paperIds = await kvGetJson(`papers:by-user:${userId}`) || [];
      const papers = [];
      
      for (const paperId of paperIds) {
        const paper = await kvGetJson(`papers:${paperId}`);
        if (paper) {
          papers.push(paper);
        }
      }

      // 计算统计
      const totalPapers = papers.length;
      const readPapers = papers.filter(p => p.readingStatus === 'completed' || p.isRead).length;
      const readingPapers = papers.filter(p => p.readingStatus === 'reading').length;
      const unreadPapers = papers.filter(p => p.readingStatus === 'unread' || !p.readingStatus).length;
      const favoritedPapers = papers.filter(p => p.isFavorited).length;

      // 生成模拟热力图数据
      const today = new Date();
      const weeklyHeatmap = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return Math.floor(Math.random() * 5); // 模拟数据
      });

      const stats = {
        totalPapers,
        weeklyRead: Math.floor(Math.random() * 10) + 1,
        toRead: unreadPapers,
        points: readPapers * 50 + favoritedPapers * 10,
        streakDays: Math.floor(Math.random() * 30) + 1,
        weeklyHeatmap,
        readPapers,
        readingPapers,
        unreadPapers,
        weeklyGoal: 10,
        weeklyCompleted: Math.min(readPapers, 10),
        totalReadingTime: readPapers * 30 // 分钟
      };

      return success(stats);
    } catch (e) {
      console.error('[Stats/Reading] Error:', e);
      return error('Failed to get stats', 500);
    }
  }
};
