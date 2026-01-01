/**
 * UI 層 - 移動模式管理器
 * UI Layer - Move Mode Manager
 * 負責：單位移動模式的管理（類似部署模式）
 */

export class MoveModeManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isMoveMode = false;
    this.moveUnit = null;
    this.customCursor = null;
    this.canvas = null;
    this.hintElement = null;

    // 保存綁定的函數引用，以便正確移除監聽器
    this._boundOnMouseMove = null;
    this._boundOnCanvasClick = null;
    this._boundOnKeyDown = null;

    this._setupEventListeners();
  }

  /**
   * 設置事件監聽
   */
  _setupEventListeners() {
    // 進入移動模式
    this.eventBus.on('ui:enter-move-mode', ({ uuid }) => {
      this._enterMoveMode(uuid);
    });

    // 退出移動模式
    this.eventBus.on('ui:exit-move-mode', () => {
      this._exitMoveMode();
    });
  }

  /**
   * 進入移動模式
   */
  async _enterMoveMode(uuid) {
    // 如果已在移動模式，先退出
    if (this.isMoveMode) {
      this._exitMoveMode();
    }

    // 獲取單位資料
    this.eventBus.emit('ui:get-unit-data', {
      uuid,
      callback: (unitData) => {
        if (!unitData) {
          console.error('找不到要移動的單位:', uuid);
          return;
        }
        this.moveUnit = { ...unitData, uuid };
        this._setupMoveMode();
      }
    });
  }

  /**
   * 設置移動模式
   */
  async _setupMoveMode() {
    this.isMoveMode = true;
    this.canvas = document.getElementById('main-canvas');
    if (!this.canvas) {
      console.error('找不到 canvas 元素');
      return;
    }

    // 創建自定義游標
    await this._createMoveCursor();

    // 顯示提示訊息
    this._showHint();

    // 綁定事件（保存引用以便移除）
    this.canvas.style.cursor = 'none';
    this._boundOnMouseMove = this._onMouseMove.bind(this);
    this._boundOnCanvasClick = this._onCanvasClick.bind(this);
    this._boundOnKeyDown = this._onKeyDown.bind(this);

    this.canvas.addEventListener('mousemove', this._boundOnMouseMove);
    this.canvas.addEventListener('click', this._boundOnCanvasClick);
    document.addEventListener('keydown', this._boundOnKeyDown);

    // 觸發移動模式事件
    this.eventBus.emit('ui:move-unit-mode', { uuid: this.moveUnit.uuid });
  }

  /**
   * 創建移動游標
   */
  async _createMoveCursor() {
    if (this.customCursor) {
      document.body.removeChild(this.customCursor);
    }

    this.customCursor = document.createElement('div');
    this.customCursor.className = 'move-cursor';

    // 使用 milsymbol 生成符號
    const symbol = new window.ms.Symbol(this.moveUnit.sidc, {
      size: 40,
      uniqueDesignation: this.moveUnit.designation || '',
      higherFormation: this.moveUnit.higherFormation || ''
    });
    const symbolCanvas = symbol.asCanvas();

    const img = document.createElement('img');
    img.src = symbolCanvas.toDataURL();
    img.alt = this.moveUnit.name || '單位';

    this.customCursor.appendChild(img);
    document.body.appendChild(this.customCursor);
  }

  /**
   * 顯示提示訊息
   */
  _showHint() {
    // 移除舊提示
    if (this.hintElement) {
      document.body.removeChild(this.hintElement);
    }

    this.hintElement = document.createElement('div');
    this.hintElement.className = 'mode-hint';
    this.hintElement.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 2v12M2 10h12"/>
      </svg>
      移動模式：在地圖上點擊新位置 | ESC 取消
    `;
    document.body.appendChild(this.hintElement);
  }

  /**
   * 鼠標移動處理
   */
  _onMouseMove(e) {
    if (!this.customCursor || !this.isMoveMode) return;

    // 使用 requestAnimationFrame 優化性能
    if (this._updateCursorPending) return;

    this._updateCursorPending = true;
    requestAnimationFrame(() => {
      this.customCursor.style.left = (e.clientX + 15) + 'px';
      this.customCursor.style.top = (e.clientY + 15) + 'px';
      this._updateCursorPending = false;
    });
  }

  /**
   * Canvas 點擊處理
   */
  _onCanvasClick(e) {
    if (!this.isMoveMode) return;

    // 阻止事件冒泡，防止觸發 Scene3D 的點擊處理
    e.stopPropagation();
    e.stopImmediatePropagation();

    const rect = this.canvas.getBoundingClientRect();
    const mouse = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1
    };

    // 觸發移動單位事件
    this.eventBus.emit('ui:move-unit-to-position', {
      uuid: this.moveUnit.uuid,
      mouse
    });

    // 移動完成，退出移動模式
    this._exitMoveMode();
  }

  /**
   * 鍵盤事件處理
   */
  _onKeyDown(e) {
    if (e.key === 'Escape' && this.isMoveMode) {
      this._exitMoveMode();
    }
  }

  /**
   * 退出移動模式
   */
  _exitMoveMode() {
    if (!this.isMoveMode) return;

    // 清理游標
    if (this.customCursor) {
      document.body.removeChild(this.customCursor);
      this.customCursor = null;
    }

    // 清理提示
    if (this.hintElement) {
      document.body.removeChild(this.hintElement);
      this.hintElement = null;
    }

    // 清理事件監聽器
    if (this.canvas) {
      this.canvas.style.cursor = 'default';
      if (this._boundOnMouseMove) {
        this.canvas.removeEventListener('mousemove', this._boundOnMouseMove);
      }
      if (this._boundOnCanvasClick) {
        this.canvas.removeEventListener('click', this._boundOnCanvasClick);
      }
    }
    if (this._boundOnKeyDown) {
      document.removeEventListener('keydown', this._boundOnKeyDown);
    }

    // 清理綁定函數引用
    this._boundOnMouseMove = null;
    this._boundOnCanvasClick = null;
    this._boundOnKeyDown = null;
    this._updateCursorPending = false;

    // 觸發退出移動模式事件
    this.eventBus.emit('ui:exit-move-mode');

    this.isMoveMode = false;
    this.moveUnit = null;
  }

  /**
   * 銷毀
   */
  dispose() {
    this._exitMoveMode();
  }
}
