/**
 * KV Storage 工具库
 * 封装 EdgeOne KV Storage 操作
 */

const KV = EdgeOne.env.KV.storage('ACADEMIC_KV');

/**
 * 获取值
 */
export async function kvGet(key) {
  try {
    return await KV.get(key);
  } catch (e) {
    console.error(`[KV] GET error: ${key}`, e);
    return null;
  }
}

/**
 * 设置值
 */
export async function kvSet(key, value) {
  try {
    await KV.put(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`[KV] SET error: ${key}`, e);
    return false;
  }
}

/**
 * 删除值
 */
export async function kvDel(key) {
  try {
    await KV.delete(key);
    return true;
  } catch (e) {
    console.error(`[KV] DEL error: ${key}`, e);
    return false;
  }
}

/**
 * 获取并解析 JSON
 */
export async function kvGetJson(key) {
  const value = await kvGet(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * 添加到列表
 */
export async function kvListAdd(listKey, item) {
  const list = await kvGetJson(listKey) || [];
  if (!list.includes(item)) {
    list.push(item);
    await kvSet(listKey, list);
  }
  return list;
}

/**
 * 从列表移除
 */
export async function kvListRemove(listKey, item) {
  let list = await kvGetJson(listKey) || [];
  list = list.filter(i => i !== item);
  await kvSet(listKey, list);
  return list;
}

/**
 * 获取列表
 */
export async function kvListGet(listKey) {
  return await kvGetJson(listKey) || [];
}

export default { kvGet, kvSet, kvDel, kvGetJson, kvListAdd, kvListRemove, kvListGet };
