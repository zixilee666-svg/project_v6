/**
 * 密码哈希工具库 — PBKDF2
 * 使用 Web Crypto API 实现 PBKDF2-SHA256 迭代哈希
 */

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH = 256;

/**
 * Base64URL 编码
 */
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 生成随机盐值（16 字节）
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * PBKDF2 密码哈希
 * @param {string} password - 明文密码
 * @param {Uint8Array} [salt] - 可选盐值（不提供则自动生成）
 * @returns {Promise<{hash: string, salt: string, iterations: number}>}
 */
export async function hashPassword(password, salt) {
  if (!salt) {
    salt = generateSalt();
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH
  );

  return {
    hash: base64UrlEncode(hashBuffer),
    salt: base64UrlEncode(salt.buffer),
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} storedHash - 存储的哈希值
 * @param {string} storedSalt - 存储的盐值
 * @param {number} [iterations] - 迭代次数
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash, storedSalt, iterations) {
  // 兼容旧版 SHA-256 哈希（无盐值分隔符）
  if (!storedSalt && storedHash.length === 64) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + ':joan_academic_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return legacyHash === storedHash;
  }

  // 解码盐值
  const saltBytes = base64UrlDecodeToBuffer(storedSalt);
  const result = await hashPassword(password, saltBytes);

  return result.hash === storedHash;
}

/**
 * Base64URL 解码为 Uint8Array
 */
function base64UrlDecodeToBuffer(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default { hashPassword, verifyPassword, generateSalt };
