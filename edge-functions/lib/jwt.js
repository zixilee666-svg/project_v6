/**
 * JWT 工具库
 * 使用 Web Crypto API 实现 JWT 签名和验证
 */

const JWT_SECRET = EdgeOne.env.get('JWT_SECRET') || 'academic-hub-default-secret-key-2026';
const JWT_EXPIRES_IN = EdgeOne.env.get('JWT_EXPIRES_IN') || '7d';

/**
 * Base64URL 编码
 */
function base64UrlEncode(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL 解码
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 创建 HMAC-SHA256 签名
 */
async function createSignature(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * 验证 HMAC-SHA256 签名
 */
async function verifySignature(data, signature, secret) {
  const expected = await createSignature(data, secret);
  return expected === signature;
}

/**
 * 解析过期时间
 */
function parseExpiresIn(expiresIn) {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // 默认 7 天
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const units = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return value * units[unit];
}

/**
 * 创建 JWT Token
 */
export async function createToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  
  const now = Date.now();
  const expiresAt = now + parseExpiresIn(JWT_EXPIRES_IN);
  
  const payloadWithExp = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor(expiresAt / 1000)
  };
  const payloadEncoded = base64UrlEncode(JSON.stringify(payloadWithExp));
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = await createSignature(signatureInput, JWT_SECRET);
  
  return `${signatureInput}.${signature}`;
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [headerEncoded, payloadEncoded, signature] = parts;
    
    // 验证签名
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const isValid = await verifySignature(signatureInput, signature, JWT_SECRET);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // 解析 payload
    const payload = JSON.parse(base64UrlDecode(payloadEncoded));
    
    // 验证过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, payload };
  } catch (e) {
    console.error('[JWT] Verify error:', e);
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * 从请求中提取 Token
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * 验证请求认证
 */
export async function authenticateRequest(request) {
  const token = extractToken(request);
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }
  
  const result = await verifyToken(token);
  if (!result.valid) {
    return { authenticated: false, error: result.error };
  }
  
  return { authenticated: true, user: result.payload };
}

export default { createToken, verifyToken, extractToken, authenticateRequest };
