/**
 * CrossRef 搜索 API
 * GET /api/search/crossref - 搜索学术论文
 * 调用 https://api.crossref.org/works?query=...
 */
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

    // CrossRef 搜索
    if (request.method === 'GET') {
      try {
        const query = url.searchParams.get('query');
        const page = url.searchParams.get('page') || '1';
        const rows = url.searchParams.get('rows') || '20';

        if (!query) {
          return error('Query parameter is required', 400);
        }

        // 调用 CrossRef API
        const crossrefUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&page=${page}`;
        const response = await fetch(crossrefUrl, {
          headers: {
            'User-Agent': 'AcademicHub/1.0 (mailto:admin@academichub.com)'
          }
        });

        if (!response.ok) {
          console.error('[CrossRef] API error:', response.status);
          return error('Failed to search CrossRef', response.status);
        }

        const data = await response.json();

        // 解析结果
        const results = (data.message?.items || []).map(item => {
          const authors = (item.author || []).map(a =>
            `${a.given || ''} ${a.family || ''}`.trim()
          ).join(', ');

          return {
            doi: item.DOI,
            title: (item.title || [''])[0],
            authors,
            year: item.published?.['date-parts']?.[0]?.[0] || null,
            journal: item['container-title']?.[0] || '',
            volume: item.volume || '',
            issue: item.issue || '',
            pages: item.page || '',
            abstract: item.abstract || '',
            url: item.URL || `https://doi.org/${item.DOI}`,
            citationCount: item['is-referenced-by-count'] || 0,
            type: item.type || 'journal-article'
          };
        });

        return success({
          results,
          total: data.message?.['total-results'] || 0,
          page: parseInt(page),
          rows: parseInt(rows)
        });
      } catch (e) {
        console.error('[CrossRef] Error:', e);
        return error('Failed to search CrossRef', 500);
      }
    }

    return error('Method not allowed', 405);
  }
};
