/**
 * UI 層 - 移動路徑 UI 管理器
 * UI Layer - Move Path UI Manager
 * 負責：DOM 操作、用戶交互、事件發送
 */

export class MovePathUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.active = false;
    this.originalPosition = null;
    this.currentUnitUuid = null;  // 保存當前編輯的單位 UUID

    // 提示元素
    this.hintElement = null;
    this._escCleanup = null;

    // 事件清理
    this._eventCleanup = [];
    this._canvasCleanup = null;

    this._setupEventListeners();
  }

  /**
   * 設置事件監聽
   */
  _setupEventListeners() {
    // 監聽退出移動模式
    const cleanup1 = this.eventBus.on('ui:exit-move-path-mode', () => {
      this.deactivate();
    });
    this._eventCleanup.push(cleanup1);

    // 監聽路徑模式激活事件
    const cleanup2 = this.eventBus.on('engine:path-mode-active', ({ uuid, waypoints }) => {
      this._showPathModeActive();
    });
    this._eventCleanup.push(cleanup2);

    // 監聽路徑模式非激活事件
    const cleanup3 = this.eventBus.on('engine:path-mode-inactive', () => {
      this._hidePathModeActive();
    });
    this._eventCleanup.push(cleanup3);

    // 監聽路徑點添加事件
    const cleanup4 = this.eventBus.on('engine:path-waypoint-added', () => {
      // UI 可以在這裡更新顯示
    });
    this._eventCleanup.push(cleanup4);
  }

  /**
   * 激活移動路徑編輯模式
   */
  activate(unitData) {
    console.log('[MovePathUI] 激活移動路徑編輯模式, 單位:', unitData.uuid);

    this.active = true;
    this.currentUnitUuid = unitData.uuid;  // 保存當前單位 UUID

    // 發送事件到 Engine 層加載路徑（路徑已在 main.js 中準備好）
    this.eventBus.emit('ui:load-move-path', {
      uuid: unitData.uuid,
      path: unitData.movePath || []
    });

    this._setupCanvasInteraction();
    this._showHint();

    // 發送事件通知 UI
    this.eventBus.emit('ui:move-path-mode-active', {
      uuid: unitData.uuid
    });
  }

  /**
   * 停用移動路徑編輯模式
   */
  deactivate() {
    this.active = false;

    // 先停止正在播放的動畫（如果有）
    this.eventBus.emit('ui:stop-path-playback');

    // 發送事件請求保存路徑（同步事件，會立即處理並顯示灰色路徑）
    if (this.currentUnitUuid) {
      this.eventBus.emit('ui:save-move-path-request', {
        uuid: this.currentUnitUuid,
        originalPosition: this.originalPosition  // 傳遞初始位置
      });
    }

    // 隱藏提示
    this._hideHint();

    // 清理事件監聽
    if (this._canvasCleanup) {
      this._canvasCleanup();
      this._canvasCleanup = null;
    }

    // 發送事件通知 UI
    this.eventBus.emit('ui:move-path-mode-inactive');

    // 清除原始位置記錄
    this.originalPosition = null;
    this.currentUnitUuid = null;

    // 注意：不發出 ui:exit-path-edit-mode 事件，因為那會清除路徑
    // 將單位移回初始位置在 main.js 的處理器中執行
  }

  /**
   * 顯示路徑（只讀模式）
   */
  showPath(unitData) {
    if (this.active) return;

    // 準備路徑資料 - 如果沒有路徑，至少顯示單位當前位置
    let path = unitData.movePath || [];
    if (path.length === 0) {
      // 沒有路徑時，顯示單位當前位置作為單一路徑點（灰色）
      path = [{
        x: unitData.x || 0,
        y: unitData.y || 0,
        z: unitData.z || 0
      }];
      console.log('[MovePathUI] 只讀模式：顯示單位位置', path[0]);
    }

    this.eventBus.emit('ui:load-move-path', {
      uuid: unitData.uuid,
      path: path,
      readOnly: true
    });
  }

  /**
   * 隱藏路徑
   */
  hidePath() {
    if (this.active) return;
    this.eventBus.emit('ui:hide-move-path');
  }

  /**
   * 設置畫布交互
   */
  _setupCanvasInteraction() {
    const canvas = document.getElementById('main-canvas');
    if (!canvas) {
      console.error('[MovePathUI] 找不到 main-canvas');
      return;
    }

    console.log('[MovePathUI] 設置畫布交互監聽器');

    const onMouseClick = (event) => {
      if (!this.active) return;

      console.log('[MovePathUI] 畫布點擊事件觸發');

      // 阻止事件傳播
      event.stopPropagation();
      event.preventDefault();

      // 計算滑鼠位置
      const rect = canvas.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
      };

      console.log('[MovePathUI] 滑鼠位置:', mouse);

      // 發送事件到 Engine 層處理 Raycast
      this.eventBus.emit('ui:add-path-waypoint-at', { mouse });
    };

    // 使用捕獲階段
    canvas.addEventListener('click', onMouseClick, { capture: true });
    this._canvasCleanup = () => {
      console.log('[MovePathUI] 清除畫布交互監聽器');
      canvas.removeEventListener('click', onMouseClick, { capture: true });
    };
  }

  /**
   * 顯示編輯模式提示
   */
  _showHint() {
    this._hideHint();

    this.hintElement = document.createElement('div');
    this.hintElement.className = 'path-edit-hint';
    this.hintElement.innerHTML = `
      <span>點擊地圖添加路徑點</span>
      <div class="hint-actions">
        <button class="hint-btn" id="path-exit-btn">完成 (ESC)</button>
        <button class="hint-btn" id="path-clear-btn">清除路徑</button>
      </div>
    `;

    document.body.appendChild(this.hintElement);

    // 綁定按鈕事件
    const exitBtn = this.hintElement.querySelector('#path-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        console.log('[MovePathUI] 用戶點擊退出按鈕');
        this.eventBus.emit('ui:exit-move-path-mode');
      });
    }

    const clearBtn = this.hintElement.querySelector('#path-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.eventBus.emit('ui:clear-move-path');
      });
    }

    // ESC 鍵退出
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        this.deactivate();
      }
    };
    document.addEventListener('keydown', onEsc);
    this._escCleanup = () => document.removeEventListener('keydown', onEsc);
  }

  /**
   * 隱藏編輯模式提示
   */
  _hideHint() {
    if (this.hintElement) {
      this.hintElement.remove();
      this.hintElement = null;
    }
    if (this._escCleanup) {
      this._escCleanup();
      this._escCleanup = null;
    }
  }

  /**
   * 顯示路徑模式激活狀態
   */
  _showPathModeActive() {
    // 通知 PropertyUI 更新按鈕狀態
    this.eventBus.emit('ui:path-edit-button-state', { active: true });
  }

  /**
   * 隱藏路徑模式激活狀態
   */
  _hidePathModeActive() {
    // 通知 PropertyUI 更新按鈕狀態
    this.eventBus.emit('ui:path-edit-button-state', { active: false });
  }

  /**
   * 銷毀
   */
  dispose() {
    this.deactivate();
    this._eventCleanup.forEach(cleanup => cleanup());
    this._eventCleanup = [];
  }
}
