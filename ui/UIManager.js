/**
 * UI 層 - UI 總管理器
 * UI Layer - UI Manager
 * 負責：UI 初始化、事件監聽、組件協調
 */

import { eventBus, Events } from '../frontend/core/EventBus.js';
import { ORBATUI } from './managers/ORBATUI.js';
import { PropertyUI } from './managers/PropertyUI.js';
import { ToolbarUI } from './managers/ToolbarUI.js';
import { TimelineUI } from './managers/TimelineUI.js';
import { SymbolEditorUI } from './managers/SymbolEditorUI.js';

export class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.orbatUI = null;
    this.propertyUI = null;
    this.toolbarUI = null;
    this.timelineUI = null;
    this.symbolEditorUI = null;
  }

  /**
   * 初始化 UI
   */
  initialize() {
    // 初始化各個 UI 管理器
    this.orbatUI = new ORBATUI(this.eventBus);
    this.propertyUI = new PropertyUI(this.eventBus);
    this.toolbarUI = new ToolbarUI(this.eventBus);
    this.timelineUI = new TimelineUI(this.eventBus);
    this.symbolEditorUI = new SymbolEditorUI(this.eventBus);
    this.symbolEditorUI.initialize();

    // 設定事件處理
    this._setupEventHandlers();

    console.log('UI 管理器已就緒');
  }

  /**
   * 設定事件處理器
   */
  _setupEventHandlers() {
    // 後端單位變更 → 更新 ORBAT 樹
    this.eventBus.on('backend:unit:added', ({ unit }) => {
      this.orbatUI.addUnitNode(unit);
    });

    this.eventBus.on('backend:unit:updated', ({ uuid, updates }) => {
      this.orbatUI.updateUnitNode(uuid, updates);
    });

    this.eventBus.on('backend:unit:removed', ({ uuid }) => {
      this.orbatUI.removeUnitNode(uuid);
      this.propertyUI.clear();
    });

    // 單位選取 → 更新屬性面板
    this.eventBus.on(Events.UI_UNIT_SELECTED, ({ uuid }) => {
      this.propertyUI.showUnit(uuid);
    });

    this.eventBus.on(Events.UI_UNIT_DESELECTED, () => {
      this.propertyUI.clear();
    });

    // 符號編輯器事件 - 切換到符號編輯器標籤頁
    this.eventBus.on('ui:tool:changed', ({ tool }) => {
      if (tool === 'symbol-editor') {
        // 切換到符號編輯器標籤頁
        const symbolEditorTab = document.querySelector('.tab-btn[data-tab="symbol-editor"]');
        if (symbolEditorTab) {
          symbolEditorTab.click();
        }
      }
    });

    this.eventBus.on('symbol-editor:apply', ({ sidc }) => {
      // 應用新 SIDC 到選中的單位
      this.eventBus.emit('ui:update-unit-sidc', { sidc });
    });

    // 符號編輯器新增單位到 ORBAT - 轉發給後端處理
    this.eventBus.on('symbol-editor:add-to-orbat', ({ sidc, name, callsign, strength, parentId }) => {
      this.eventBus.emit('ui:add-orbat-unit', {
        sidc,
        name,
        callsign,
        strength,
        authorizedStrength: strength,
        parentId,
        x: 0,
        y: 0,
        z: 0
      });
    });

    // 請求單位列表（對話框需要填充上級單位選項）- 轉發給後端
    this.eventBus.on('orbat:request-units', ({ callback }) => {
      this.eventBus.emit('ui:get-orbat-units', { callback });
    });
  }

  /**
   * 銷毀
   */
  dispose() {
    if (this.orbatUI) this.orbatUI.dispose();
    if (this.propertyUI) this.propertyUI.dispose();
    if (this.toolbarUI) this.toolbarUI.dispose();
    if (this.timelineUI) this.timelineUI.dispose();
    if (this.symbolEditorUI) this.symbolEditorUI.dispose();
  }
}
