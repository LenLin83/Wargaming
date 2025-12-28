/**
 * 前端層 - UUID 生成器
 * Frontend Layer - UUID Generator
 */

/**
 * 生成 UUID v4
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成短 UUID
 */
export function generateShortUUID() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 生成單位 UUID
 */
export function generateUnitUUID() {
  return 'u-' + Date.now() + '-' + generateShortUUID();
}

/**
 * 生成場景 UUID
 */
export function generateSceneUUID() {
  return 'scene-' + Date.now() + '-' + generateShortUUID();
}

/**
 * 生成圖形 UUID
 */
export function generateGraphicUUID() {
  return 'graphic-' + Date.now() + '-' + generateShortUUID();
}
