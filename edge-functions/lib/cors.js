/**
 * HTTP 响应工具库
 */

// CORS 允许的域名列表（* 表示允许所有）
const ALLOWED_ORIGINS = EdgeOne?.env?.get('CORS_ORIGINS') || '*';

/**
 * 获取 CORS 的 Access-Control-Allow-Origin 值
 */
function getCorsOrigin(request) {
  if (ALLOWED_ORIGINS === '*') return '*';
  const allowedList = ALLOWED_ORIGINS.split(',').map(s => s.trim());
  const origin = request?.headers?.get('Origin') || '';
  if (allowedList.includes(origin)) return origin;
  // 回退到第一个配置的域名
  return allowedList[0] || '*';
}

/**
 * 创建 JSON 响应
 */
export function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getCorsOrigin(request),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

/**
 * 创建成功响应
 */
export function success(data, message = 'Success', request) {
  return json({ success: true, data, message }, 200, request);
}

/**
 * 创建错误响应
 */
export function error(message, status = 400, code = 'ERROR', request) {
  return json({ success: false, error: message, code }, status, request);
}

/**
 * 创建未授权响应
 */
export function unauthorized(message = 'Unauthorized', request) {
  return error(message, 401, 'UNAUTHORIZED', request);
}

/**
 * 创建禁止响应
 */
export function forbidden(message = 'Forbidden', request) {
  return error(message, 403, 'FORBIDDEN', request);
}

/**
 * 创建未找到响应
 */
export function notFound(message = 'Not found', request) {
  return error(message, 404, 'NOT_FOUND', request);
}

/**
 * 创建服务器错误响应
 */
export function serverError(message = 'Internal server error', request) {
  return error(message, 500, 'SERVER_ERROR', request);
}

/**
 * 解析 JSON 请求体
 */
export async function parseJsonBody(request) {
  try {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error('[Parse] JSON parse error:', e);
    return null;
  }
}

/**
 * 创建带 CORS 头的响应
 */
export function withCors(response, request) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', getCorsOrigin(request));
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default { json, success, error, unauthorized, forbidden, notFound, serverError, parseJsonBody, withCors };
