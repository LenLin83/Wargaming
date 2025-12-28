/**
 * 後端層 - 本地儲存
 * Backend Layer - Local Storage
 */

/**
 * 本地儲存
 * 資料持久化到瀏覽器 localStorage
 */
export class LocalStorage {
  constructor(prefix = 'wargame-') {
    this.prefix = prefix;
  }

  /**
   * 產生完整鍵名
   */
  _getKey(key) {
    return this.prefix + key;
  }

  /**
   * 儲存資料
   */
  set(key, value) {
    try {
      const json = JSON.stringify(value);
      localStorage.setItem(this._getKey(key), json);
      return true;
    } catch (e) {
      console.error('LocalStorage set error:', e);
      return false;
    }
  }

  /**
   * 取得資料
   */
  get(key) {
    try {
      const json = localStorage.getItem(this._getKey(key));
      if (json === null) return null;
      return JSON.parse(json);
    } catch (e) {
      console.error('LocalStorage get error:', e);
      return null;
    }
  }

  /**
   * 刪除資料
   */
  delete(key) {
    localStorage.removeItem(this._getKey(key));
    return true;
  }

  /**
   * 檢查資料是否存在
   */
  has(key) {
    return localStorage.getItem(this._getKey(key)) !== null;
  }

  /**
   * 清空所有資料
   */
  clear() {
    // 只刪除帶前綴的項目
    const keys = this.keys();
    for (const key of keys) {
      localStorage.removeItem(this._getKey(key));
    }
  }

  /**
   * 取得所有鍵
   */
  keys() {
    const result = [];
    const prefixLength = this.prefix.length;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        result.push(key.slice(prefixLength));
      }
    }

    return result;
  }

  /**
   * 取得所有值
   */
  values() {
    const keys = this.keys();
    return keys.map(key => this.get(key)).filter(v => v !== null);
  }

  /**
   * 取得資料量
   */
  get size() {
    return this.keys().length;
  }
}
