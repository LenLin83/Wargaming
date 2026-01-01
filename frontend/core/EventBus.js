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

  // ========== 標籤頁事件 ==========
  TAB_CHANGED: 'tab:changed',

  // ========== 組織事件 ==========
  ORGANIZATION_LOADED: 'organization:loaded',
  ORGANIZATION_SAVED: 'organization:saved',

  // ========== UI 事件 ==========
  UI_UNIT_SELECTED: 'ui:unit:selected',
  UI_UNIT_DESELECTED: 'ui:unit:deselected',
  UI_TOOL_CHANGED: 'ui:tool:changed',
  UI_PANEL_TOGGLED: 'ui:panel:toggled',
  UI_ENTER_MOVE_MODE: 'ui:enter-move-mode',
  UI_EXIT_MOVE_MODE: 'ui:exit-move-mode',
  UI_MOVE_UNIT_MODE: 'ui:move-unit-mode',
  UI_MOVE_UNIT_TO_POSITION: 'ui:move-unit-to-position',
  UI_GET_UNIT_DATA: 'ui:get-unit-data',
  UI_UPDATE_FIREPOWER: 'ui:update-firepower',
  UI_UPDATE_UNIT: 'ui:update-unit',
  UI_UPDATE_UNIT_SIDC: 'ui:update-unit-sidc',
  UI_ADD_ORBAT_UNIT: 'ui:add-orbat-unit',
  UI_GET_ORBAT_UNITS: 'ui:get-orbat-units',
  UI_DELETE_UNIT: 'ui:delete-unit',
  UI_MOVE_UNIT: 'ui:move-unit',
  UI_REBUILD_ORBAT_TREE: 'ui:rebuild-orbat-tree',
  UI_ENTER_DEPLOY_MODE: 'ui:enter-deploy-mode',
  UI_EXIT_DEPLOY_MODE: 'ui:exit-deploy-mode',
  UI_DEPLOY_UNIT: 'ui:deploy-unit',

  // 移動路徑事件
  UI_ENTER_MOVE_PATH_MODE: 'ui:enter-move-path-mode',
  UI_EXIT_MOVE_PATH_MODE: 'ui:exit-move-path-mode',
  UI_PLAY_MOVE_PATH: 'ui:play-move-path',
  UI_REMOVE_PATH_WAYPOINT: 'ui:remove-path-waypoint',
  UI_SAVE_MOVE_PATH: 'ui:save-move-path',
  UI_MOVE_PATH_MODE_ACTIVE: 'ui:move-path-mode-active',
  UI_MOVE_PATH_MODE_INACTIVE: 'ui:move-path-mode-inactive',
  UI_MOVE_PATH_WAYPOINT_ADDED: 'ui:move-path-waypoint-added',
  UI_MOVE_PATH_WAYPOINT_REMOVED: 'ui:move-path-waypoint-removed',
  UI_MOVE_PATH_CLEARED: 'ui:move-path-cleared',
  UI_MOVE_PATH_PLAYBACK_START: 'ui:move-path-playback-start',
  UI_MOVE_PATH_PLAYBACK_STOPPED: 'ui:move-path-playback-stopped',
  UI_MOVE_PATH_PLAYBACK_COMPLETE: 'ui:move-path-playback-complete',
  UI_SHOW_MOVE_PATH: 'ui:show-move-path',
  UI_HIDE_MOVE_PATH: 'ui:hide-move-path',
  UI_LOAD_MOVE_PATH: 'ui:load-move-path',
  UI_ADD_PATH_WAYPOINT_AT: 'ui:add-path-waypoint-at',
  UI_CLEAR_MOVE_PATH: 'ui:clear-move-path',
  UI_RETURN_UNIT_TO_POSITION: 'ui:return-unit-to-position',
  UI_EXIT_PATH_EDIT_MODE: 'ui:exit-path-edit-mode',
  UI_PATH_EDIT_BUTTON_STATE: 'ui:path-edit-button-state',

  // 播放控制事件
  UI_PLAYBACK_TOGGLED: 'ui:playback:toggled',
  UI_PLAYBACK_SPEED: 'ui:playback:speed',

  // 相機事件
  UI_CAMERA_RESET: 'ui:camera:reset',
  UI_CAMERA_FOCUS: 'ui:camera:focus',
  UI_GRID_TOGGLE: 'ui:grid:toggle',

  // 符號編輯器事件
  SYMBOL_EDITOR_CHANGED: 'symbol-editor:changed',
  SYMBOL_EDITOR_PREVIEW_CHANGED: 'symbol-editor:preview-changed',
  SYMBOL_EDITOR_APPLY: 'symbol-editor:apply',
  SYMBOL_EDITOR_ADD_TO_ORBAT: 'symbol-editor:add-to-orbat',
  SYMBOL_EDITOR_SET_PARENT_UNIT: 'symbol-editor:set-parent-unit',

  // ORBAT 請求事件
  ORBAT_REQUEST_UNITS: 'orbat:request-units',

  // ========== 後端事件 ==========
  BACKEND_UNIT_ADDED: 'backend:unit:added',
  BACKEND_UNIT_UPDATED: 'backend:unit:updated',
  BACKEND_UNIT_REMOVED: 'backend:unit:removed',
  BACKEND_UNIT_MOVED: 'backend:unit:moved',
  BACKEND_ORBAT_CLEARED: 'backend:orbat:cleared',
  BACKEND_SCENE_LOADED: 'backend:scene:loaded',
  BACKEND_SCENE_SAVED: 'backend:scene:saved',
  BACKEND_SCENE_CLEARED: 'backend:scene:cleared',
  BACKEND_SCENE_CREATED: 'backend:scene:created',
  BACKEND_SCENE_SETTINGS_UPDATED: 'backend:scene:settings:updated',
  BACKEND_SCENE_UNIT_ADDED: 'backend:scene:unit:added',
  BACKEND_SCENE_UNIT_REMOVED: 'backend:scene:unit:removed',
  BACKEND_SCENE_UNIT_UPDATED: 'backend:scene:unit:updated',
  BACKEND_SCENE_GRAPHIC_ADDED: 'backend:scene:graphic:added',
  BACKEND_SCENE_GRAPHIC_REMOVED: 'backend:scene:graphic:removed',
  BACKEND_SCENE_TIME_UPDATED: 'backend:scene:time:updated',
  BACKEND_SCENE_PLAYBACK_TOGGLED: 'backend:scene:playback:toggled',
  BACKEND_SCENE_PLAYBACK_SPEED_CHANGED: 'backend:scene:playback:speed:changed',

  // ========== 3D 引擎事件 ==========
  ENGINE_SCENE_READY: 'engine:scene:ready',
  ENGINE_UNIT_ADDED: 'engine:unit:added',
  ENGINE_UNIT_REMOVED: 'engine:unit:removed',
  ENGINE_TERRAIN_READY: 'engine:terrain:ready',
  ENGINE_RENDER_TICK: 'engine:render:tick',

  // 移動路徑引擎事件
  ENGINE_PATH_MODE_ACTIVE: 'engine:path-mode-active',
  ENGINE_PATH_MODE_INACTIVE: 'engine:path-mode-inactive',
  ENGINE_PATH_WAYPOINT_ADDED: 'engine:path-waypoint-added',
  ENGINE_PATH_WAYPOINT_REMOVED: 'engine:path-waypoint-removed',
  ENGINE_PATH_CLEARED: 'engine:path-cleared',
  ENGINE_PATH_PLAYBACK_START: 'engine:path-playback-start',
  ENGINE_PATH_PLAYBACK_STOPPED: 'engine:path-playback-stopped',
  ENGINE_PATH_PLAYBACK_COMPLETE: 'engine:path-playback-complete',

  // ========== GUI 事件 ==========
  GUI_SYMBOL_SIZE: 'gui:symbol:size',
  GUI_SYMBOL_HEIGHT: 'gui:symbol:height',
  GUI_CONNECTION_SHOW: 'gui:connection:show',
  GUI_CONNECTION_OPACITY: 'gui:connection:opacity',
  GUI_MODEL_SIZE: 'gui:model:size',
  GUI_SYMBOL_TOGGLE: 'gui:symbol:toggle',
  GUI_MODEL_TOGGLE: 'gui:model:toggle',
  GUI_LABEL_TOGGLE: 'gui:label:toggle',
  GUI_GRID_TOGGLE: 'gui:grid:toggle',
  GUI_FOG_TOGGLE: 'gui:fog:toggle',
  GUI_CAMERA_DISTANCE: 'gui:camera:distance'
};

// 建立全域事件匯流排實例
export const eventBus = new EventBus();
