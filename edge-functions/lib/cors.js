/**
 * HTTP 响应工具库
 */

/**
 * 创建 JSON 响应
 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

/**
 * 创建成功响应
 */
export function success(data, message = 'Success') {
  return json({ success: true, data, message });
}

/**
 * 创建错误响应
 */
export function error(message, status = 400, code = 'ERROR') {
  return json({ success: false, error: message, code }, status);
}

/**
 * 创建未授权响应
 */
export function unauthorized(message = 'Unauthorized') {
  return error(message, 401, 'UNAUTHORIZED');
}

/**
 * 创建禁止响应
 */
export function forbidden(message = 'Forbidden') {
  return error(message, 403, 'FORBIDDEN');
}

/**
 * 创建未找到响应
 */
export function notFound(message = 'Not found') {
  return error(message, 404, 'NOT_FOUND');
}

/**
 * 创建服务器错误响应
 */
export function serverError(message = 'Internal server error') {
  return error(message, 500, 'SERVER_ERROR');
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
export function withCors(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default { json, success, error, unauthorized, forbidden, notFound, serverError, parseJsonBody, withCors };
