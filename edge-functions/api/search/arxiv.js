/**
 * 学术搜索 API
 * GET /api/search/arxiv - 搜索 arXiv 论文
 */
import { authenticateRequest } from '../../../lib/jwt.js';
import { success, error, unauthorized } from '../../../lib/cors.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

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

      const query = url.searchParams.get('query');
      const start = parseInt(url.searchParams.get('start') || '0');
      const maxResults = parseInt(url.searchParams.get('maxResults') || '10');

      if (!query) {
        return error('Query is required', 400);
      }

      // 调用 arXiv API
      const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

      const response = await fetch(arxivUrl);
      
      if (!response.ok) {
        console.error('[Search/Arxiv] ArXiv API error:', response.status);
        return success([]); // 返回空数组而不是错误
      }

      const xmlText = await response.text();
      
      // 简单解析 ATOM feed
      const papers = [];
      const entries = xmlText.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
      
      for (const entry of entries) {
        const getTag = (tag) => {
          const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
          return match ? match[1].trim() : '';
        };
        
        const getTags = (tag) => {
          const matches = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g')) || [];
          return matches.map(m => {
            const match = m.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
            return match ? match[1].trim() : '';
          });
        };

        const id = getTag('id');
        const arxivId = id.split('/').pop();

        papers.push({
          id: `arxiv-${arxivId}`,
          title: getTag('title').replace(/\s+/g, ' '),
          authors: getTags('author').map(a => getTag('name', a)),
          summary: getTag('summary').replace(/\s+/g, ' '),
          published: getTag('published'),
          updated: getTag('updated'),
          comment: getTag('arxiv:comment'),
          journalRef: getTag('arxiv:journal_ref'),
          doi: getTag('arxiv:doi'),
          primaryCategory: getTag('arxiv:primary_category'),
          categories: getTags('category'),
          pdfUrl: id.replace('/abs/', '/pdf/'),
          abstract: getTag('summary').replace(/\s+/g, ' ')
        });
      }

      return success(papers);
    } catch (e) {
      console.error('[Search/Arxiv] Error:', e);
      return error('Search failed', 500);
    }
  }
};
