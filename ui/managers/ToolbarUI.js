/**
 * UI 層 - 工具列管理器
 * UI Layer - Toolbar Manager
 * 負責：工具列按鈕事件處理
 */

export class ToolbarUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activeTool = 'select';
    this._setupEventListeners();
  }

  /**
   * 設定事件監聽
   */
  _setupEventListeners() {
    // 工具按鈕
    const toolButtons = document.querySelectorAll('.tool-button[data-tool]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this._setActiveTool(tool);
      });
    });

    // 動作按鈕
    const actionButtons = document.querySelectorAll('.tool-button[data-action]');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this._handleAction(action);
      });
    });
  }

  /**
   * 設定啟用工具
   */
  _setActiveTool(tool) {
    this.activeTool = tool;

    // 更新 UI 狀態
    document.querySelectorAll('.tool-button[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    // 觸發事件
    this.eventBus.emit('ui:tool:changed', { tool });
  }

  /**
   * 處理動作
   */
  _handleAction(action) {
    switch (action) {
      case 'reset-view':
        this.eventBus.emit('ui:camera:reset');
        break;
      case 'focus-selected':
        this.eventBus.emit('ui:camera:focus');
        break;
      case 'toggle-grid':
        this.eventBus.emit('ui:grid:toggle');
        break;
      case 'symbol-editor':
        this.eventBus.emit('ui:tool:changed', { tool: 'symbol-editor' });
        break;
    }
  }

  /**
   * 銷毀
   */
  dispose() {
    // 移除事件監聽器
    const toolButtons = document.querySelectorAll('.tool-button[data-tool]');
    toolButtons.forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });

    const actionButtons = document.querySelectorAll('.tool-button[data-action]');
    actionButtons.forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
  }
}
