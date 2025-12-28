/**
 * 前端層 - 事件匯流排
 * Frontend Layer - Event Bus
 * 負責：層間通訊、事件分發、訂閱管理
 */

export class EventBus {
  constructor() {
    this.listeners = new Map(); // event -> Set<callback>
    this.onceListeners = new Map(); // event -> Set<callback>
  }

  /**
   * 註冊事件監聽器
   * @returns 取消訂閱函數
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // 返回取消訂閱函數
    return () => this.off(event, callback);
  }

  /**
   * 移除事件監聽器
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * 觸發事件
   */
  emit(event, ...args) {
    // 處理持久監聽器
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(...args);
        } catch (e) {
          console.error(`事件處理錯誤 [${event}]:`, e);
        }
      }
    }

    // 處理一次性監聽器
    const onceCallbacks = this.onceListeners.get(event);
    if (onceCallbacks) {
      for (const callback of onceCallbacks) {
        try {
          callback(...args);
        } catch (e) {
          console.error(`一次性事件處理錯誤 [${event}]:`, e);
        }
      }
      // 執行後移除
      this.onceListeners.delete(event);
    }
  }

  /**
   * 一次性事件監聽器
   */
  once(event, callback) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event).add(callback);
  }

  /**
   * 清除所有監聽器
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * 清除特定事件的所有監聽器
   */
  clearEvent(event) {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
  }

  /**
   * 取得事件的監聽器數量
   */
  listenerCount(event) {
    const count1 = this.listeners.has(event) ? this.listeners.get(event).size : 0;
    const count2 = this.onceListeners.has(event) ? this.onceListeners.get(event).size : 0;
    return count1 + count2;
  }
}

/**
 * 事件類型定義
 */
export const Events = {
  // ========== 應用程式事件 ==========
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',

  // ========== UI 事件 ==========
  UI_UNIT_SELECTED: 'ui:unit:selected',
  UI_UNIT_DESELECTED: 'ui:unit:deselected',
  UI_TOOL_CHANGED: 'ui:tool:changed',
  UI_PANEL_TOGGLED: 'ui:panel:toggled',

  // ========== 後端事件 ==========
  BACKEND_UNIT_ADDED: 'backend:unit:added',
  BACKEND_UNIT_UPDATED: 'backend:unit:updated',
  BACKEND_UNIT_REMOVED: 'backend:unit:removed',
  BACKEND_UNIT_MOVED: 'backend:unit:moved',
  BACKEND_SCENE_LOADED: 'backend:scene:loaded',
  BACKEND_SCENE_SAVED: 'backend:scene:saved',
  BACKEND_SCENE_CLEARED: 'backend:scene:cleared',

  // ========== 3D 引擎事件 ==========
  ENGINE_SCENE_READY: 'engine:scene:ready',
  ENGINE_UNIT_ADDED: 'engine:unit:added',
  ENGINE_UNIT_REMOVED: 'engine:unit:removed',
  ENGINE_TERRAIN_READY: 'engine:terrain:ready',
  ENGINE_RENDER_TICK: 'engine:render:tick'
};

// 建立全域事件匯流排實例
export const eventBus = new EventBus();
