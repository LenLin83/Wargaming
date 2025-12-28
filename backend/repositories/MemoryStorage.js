/**
 * 後端層 - 記憶體儲存
 * Backend Layer - In-Memory Storage
 */

/**
 * 記憶體儲存
 * 資料僅存在於記憶體中，重新整理後會遺失
 */
export class MemoryStorage {
  constructor() {
    this.data = new Map();
  }

  /**
   * 儲存資料
   */
  set(key, value) {
    this.data.set(key, value);
  }

  /**
   * 取得資料
   */
  get(key) {
    return this.data.get(key);
  }

  /**
   * 刪除資料
   */
  delete(key) {
    return this.data.delete(key);
  }

  /**
   * 檢查資料是否存在
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * 清空所有資料
   */
  clear() {
    this.data.clear();
  }

  /**
   * 取得所有鍵
   */
  keys() {
    return Array.from(this.data.keys());
  }

  /**
   * 取得所有值
   */
  values() {
    return Array.from(this.data.values());
  }

  /**
   * 取得所有項目
   */
  entries() {
    return Array.from(this.data.entries());
  }

  /**
   * 取得資料量
   */
  get size() {
    return this.data.size;
  }
}
