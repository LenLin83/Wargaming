/**
 * UI 層 - 屬性面板管理器
 * UI Layer - Property Panel Manager
 * 負責：單位屬性顯示與編輯
 */

export class PropertyUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = document.getElementById('property-content');
    this.currentUnit = null;
    this.currentUnitData = null;

    // 事件監聽器清理函數
    this._eventCleanup = [];
    // 輸入框清理函數
    this._inputCleanup = [];

    this._setupEventListeners();
  }

  /**
   * 設置事件監聽
   */
  _setupEventListeners() {
    // 移動單位按鈕激活
    const cleanup1 = this.eventBus.on('ui:move-unit-mode', ({ uuid }) => {
      this._showMoveModeActive(uuid);
    });
    this._eventCleanup.push(cleanup1);

    // 退出移動模式
    const cleanup2 = this.eventBus.on('ui:exit-move-mode', () => {
      this._hideMoveModeActive();
    });
    this._eventCleanup.push(cleanup2);

    // 監聽單位更新事件（移動後更新位置顯示）
    const cleanup3 = this.eventBus.on('backend:unit:updated', ({ uuid, updates }) => {
      if (this.currentUnit && this.currentUnit.uuid === uuid) {
        // 更新單位資料
        if (this.currentUnitData) {
          Object.assign(this.currentUnitData, updates);

          // 更新位置顯示
          if (updates.x !== undefined || updates.y !== undefined || updates.z !== undefined) {
            this._updatePositionDisplay();
          }

          // 更新路徑資訊顯示（如果路徑被更新）
          if (updates.movePath !== undefined) {
            this._updatePathInfo();
          }
        }
      }
    });
    this._eventCleanup.push(cleanup3);

    // 監聽路徑模式激活事件
    const cleanup4 = this.eventBus.on('ui:move-path-mode-active', ({ uuid }) => {
      if (this.currentUnit && this.currentUnit.uuid === uuid) {
        this._showPathModeActive();
      }
    });
    this._eventCleanup.push(cleanup4);

    // 監聽路徑模式非激活事件
    const cleanup5 = this.eventBus.on('ui:move-path-mode-inactive', () => {
      this._hidePathModeActive();
    });
    this._eventCleanup.push(cleanup5);

    // 監聽路徑點添加事件
    const cleanup6 = this.eventBus.on('ui:move-path-waypoint-added', ({ waypointIndex, totalWaypoints }) => {
      if (this.currentUnitData) {
        // 從後端重新獲取單位資料以同步路徑
        this.eventBus.emit('ui:get-unit-data', {
          uuid: this.currentUnit.uuid,
          callback: (data) => {
            this.currentUnitData = data;
            this._updatePathInfo();
          }
        });
      }
    });
    this._eventCleanup.push(cleanup6);

    // 監聽路徑點移除事件
    const cleanup7 = this.eventBus.on('ui:move-path-waypoint-removed', () => {
      if (this.currentUnitData) {
        this.eventBus.emit('ui:get-unit-data', {
          uuid: this.currentUnit.uuid,
          callback: (data) => {
            this.currentUnitData = data;
            this._updatePathInfo();
          }
        });
      }
    });
    this._eventCleanup.push(cleanup7);

    // 監聽路徑清除事件
    const cleanup8 = this.eventBus.on('ui:move-path-cleared', () => {
      if (this.currentUnitData) {
        this.eventBus.emit('ui:get-unit-data', {
          uuid: this.currentUnit.uuid,
          callback: (data) => {
            this.currentUnitData = data;
            this._updatePathInfo();
          }
        });
      }
    });
    this._eventCleanup.push(cleanup8);
  }

  /**
   * 顯示單位屬性
   */
  showUnit(uuid) {
    this.currentUnit = { uuid };

    // 從後端服務取得單位資料
    this.eventBus.emit('ui:get-unit-data', {
      uuid,
      callback: (data) => {
        this.currentUnitData = data;
        this._renderUnitInfo(data);

        // 通過 EventBus 顯示移動路徑（只讀模式，灰色）
        this.eventBus.emit('ui:show-move-path', { unitData: data });
      }
    });
  }

  /**
   * 渲染單位資訊
   */
  _renderUnitInfo(data) {
    if (!data) {
      this.container.innerHTML = `
        <div class="property-group">
          <div class="group-title">基本資訊</div>
          <div class="property-row">
            <span class="property-label">UUID</span>
            <span class="property-value">${this.currentUnit.uuid}</span>
          </div>
        </div>
      `;
      return;
    }

    // 解析 SIDC 獲取單位類型
    const affiliationMap = { 'F': '友軍', 'H': '敵軍', 'N': '中立', 'U': '未知' };
    const affiliation = affiliationMap[data.sidc?.[1]] || '未知';

    // 獲取火力配置值
    const fireRange = data.firepower?.range || 0;
    const directionStart = data.firepower?.directionStart || 0;
    const directionEnd = data.firepower?.directionEnd || 0;

    this.container.innerHTML = `
      <div class="property-group">
        <div class="group-title">基本資訊</div>
        <div class="property-row">
          <span class="property-label">部隊番號</span>
          <span class="property-value">${data.designation || '-'}</span>
        </div>
        <div class="property-row">
          <span class="property-label">陣營</span>
          <span class="property-value">${affiliation}</span>
        </div>
        <div class="property-row">
          <span class="property-label">上級單位</span>
          <span class="property-value">${data.higherFormation || '-'}</span>
        </div>
        <div class="property-row">
          <span class="property-label">SIDC</span>
          <span class="property-value">${data.sidc || '-'}</span>
        </div>
      </div>

      <div class="property-group">
        <div class="group-title">位置資訊</div>
        <div class="property-row">
          <span class="property-label">X</span>
          <span class="property-value" id="unit-pos-x">${(data.x || 0).toFixed(1)}</span>
        </div>
        <div class="property-row">
          <span class="property-label">Y</span>
          <span class="property-value" id="unit-pos-y">${(data.y || 0).toFixed(1)}</span>
        </div>
        <div class="property-row">
          <span class="property-label">Z</span>
          <span class="property-value" id="unit-pos-z">${(data.z || 0).toFixed(1)}</span>
        </div>
      </div>

      <div class="property-group">
        <div class="group-title">火力配置</div>
        <div class="property-row">
          <span class="property-label">火力範圍</span>
          <input type="number" id="fire-range-input" class="property-input" min="0" step="10" value="${fireRange}" placeholder="公尺">
        </div>
        <div class="property-row">
          <span class="property-label">射界左起</span>
          <input type="number" id="fire-direction-start-input" class="property-input" min="0" max="360" step="1" value="${directionStart}" placeholder="度數">
        </div>
        <div class="property-row">
          <span class="property-label">射界右至</span>
          <input type="number" id="fire-direction-end-input" class="property-input" min="0" max="360" step="1" value="${directionEnd}" placeholder="度數">
        </div>
        <div class="direction-reference">
          <span class="ref-label">方向參考：</span>
          <span class="ref-item">北=0°</span>
          <span class="ref-item">東=90°</span>
          <span class="ref-item">南=180°</span>
          <span class="ref-item">西=270°</span>
        </div>
        <button id="apply-firepower-btn" class="action-btn apply-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 8l3 3 5-5"/>
          </svg>
          套用火力設定
        </button>
      </div>

      <div class="property-group">
        <div class="group-title">移動路徑</div>
        <div class="path-info-row" id="path-info-row">
          <span class="path-info">未設置路徑</span>
        </div>
        <div class="path-controls">
          <button id="edit-path-btn" class="action-btn path-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7"/>
              <path d="M10.5 2.5a2.121 2.121 0 0 1 3 3L7 12l-4 1 1-4 6.5-6.5z"/>
            </svg>
            編輯路徑
          </button>
          <button id="play-path-btn" class="action-btn path-btn play-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 12,8 5,13"/>
            </svg>
            播放
          </button>
        </div>
        <div class="path-waypoints-list" id="path-waypoints-list" style="display: none;">
          <!-- 路徑點列表動態生成 -->
        </div>
      </div>

      <div class="property-group">
        <div class="group-title">操作</div>
        <button id="move-unit-btn" class="action-btn move-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 2v12M2 8h12"/>
          </svg>
          移動單位
        </button>
        <p class="hint-text">點擊按鈕後，在地圖上選擇新位置</p>
      </div>
    `;

    // 綁定火力設定按鈕事件
    this._bindFirepowerControls();

    // 綁定移動路徑按鈕事件
    this._bindMovePathControls();

    // 綁定移動按鈕事件
    const moveBtn = document.getElementById('move-unit-btn');
    if (moveBtn) {
      const onClick = () => {
        this.eventBus.emit('ui:enter-move-mode', { uuid: this.currentUnit.uuid });
      };
      moveBtn.addEventListener('click', onClick);
      // 保存清理函數
      this._btnCleanup = () => moveBtn.removeEventListener('click', onClick);
    }
  }

  /**
   * 更新位置顯示
   */
  _updatePositionDisplay() {
    const posX = document.getElementById('unit-pos-x');
    const posY = document.getElementById('unit-pos-y');
    const posZ = document.getElementById('unit-pos-z');

    if (posX) posX.textContent = (this.currentUnitData.x || 0).toFixed(1);
    if (posY) posY.textContent = (this.currentUnitData.y || 0).toFixed(1);
    if (posZ) posZ.textContent = (this.currentUnitData.z || 0).toFixed(1);
  }

  /**
   * 綁定火力控制事件
   */
  _bindFirepowerControls() {
    // 清理之前的事件監聽器
    this._inputCleanup.forEach(cleanup => cleanup());
    this._inputCleanup = [];

    const applyBtn = document.getElementById('apply-firepower-btn');
    if (!applyBtn) return;

    const onClick = () => {
      const fireRange = parseFloat(document.getElementById('fire-range-input')?.value) || 0;
      const directionStart = parseFloat(document.getElementById('fire-direction-start-input')?.value) || 0;
      const directionEnd = parseFloat(document.getElementById('fire-direction-end-input')?.value) || 0;

      // 更新單位火力資料
      if (this.currentUnitData) {
        this.currentUnitData.firepower = {
          range: fireRange,
          directionStart: directionStart,
          directionEnd: directionEnd
        };
      }

      // 發送事件更新單位
      this.eventBus.emit('ui:update-firepower', {
        uuid: this.currentUnit.uuid,
        fireRange: fireRange,
        directionStart: directionStart,
        directionEnd: directionEnd
      });
    };

    applyBtn.addEventListener('click', onClick);
    this._inputCleanup.push(() => applyBtn.removeEventListener('click', onClick));
  }

  /**
   * 綁定移動路徑控制事件
   */
  _bindMovePathControls() {
    // 清理之前的監聽器
    const editBtn = document.getElementById('edit-path-btn');
    const playBtn = document.getElementById('play-path-btn');

    if (editBtn) {
      const onEditClick = () => {
        const isActive = editBtn.classList.contains('active');
        if (isActive) {
          // 退出編輯模式
          this.eventBus.emit('ui:exit-move-path-mode');
        } else {
          // 進入編輯模式
          this.eventBus.emit('ui:enter-move-path-mode', { uuid: this.currentUnit.uuid });
        }
      };
      editBtn.addEventListener('click', onEditClick);
      this._inputCleanup.push(() => editBtn.removeEventListener('click', onEditClick));
    }

    if (playBtn) {
      const onPlayClick = () => {
        this.eventBus.emit('ui:play-move-path', { uuid: this.currentUnit.uuid });
      };
      playBtn.addEventListener('click', onPlayClick);
      this._inputCleanup.push(() => playBtn.removeEventListener('click', onPlayClick));
    }

    // 更新路徑資訊顯示
    this._updatePathInfo();
  }

  /**
   * 更新路徑資訊顯示
   */
  _updatePathInfo() {
    const pathInfoRow = document.getElementById('path-info-row');
    const waypointsList = document.getElementById('path-waypoints-list');

    if (!pathInfoRow) return;

    const movePath = this.currentUnitData?.movePath || [];

    // 顯示路徑點列表（即使只有 1 個點也顯示）
    if (waypointsList) {
      if (movePath.length === 0) {
        waypointsList.style.display = 'none';
        pathInfoRow.innerHTML = '<span class="path-info">未設置路徑</span>';
        return;
      }

      // 計算路徑長度
      let totalLength = 0;
      for (let i = 1; i < movePath.length; i++) {
        const dx = movePath[i].x - movePath[i-1].x;
        const dz = movePath[i].z - movePath[i-1].z;
        totalLength += Math.sqrt(dx * dx + dz * dz);
      }

      pathInfoRow.innerHTML = `
        <span class="path-info">路徑點: ${movePath.length} | 總長: ${totalLength.toFixed(1)}m</span>
      `;

      // 顯示路徑點列表
      waypointsList.style.display = 'block';
      waypointsList.innerHTML = movePath.map((wp, i) => `
        <div class="waypoint-item">
          <span class="waypoint-index">${i}</span>
          <span class="waypoint-coords">(${wp.x.toFixed(0)}, ${wp.z.toFixed(0)})</span>
          ${i > 0 ? `<button class="waypoint-remove-btn" data-index="${i}">✕</button>` : '<span class="waypoint-start">起點</span>'}
        </div>
      `).join('');

      // 綁定刪除按鈕事件
      waypointsList.querySelectorAll('.waypoint-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          this.eventBus.emit('ui:remove-path-waypoint', {
            uuid: this.currentUnit.uuid,
            index: index
          });
        });
      });
    }
  }

  /**
   * 顯示移動模式激活狀態
   */
  _showMoveModeActive(uuid) {
    const moveBtn = document.getElementById('move-unit-btn');
    if (moveBtn) {
      moveBtn.classList.add('active');
      moveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 10l-4 4m0-4l4 4M2 6l4-4m-4 0l4 4"/>
        </svg>
        點擊地圖移動 (ESC 取消)
      `;
    }
  }

  /**
   * 隱藏移動模式激活狀態
   */
  _hideMoveModeActive() {
    const moveBtn = document.getElementById('move-unit-btn');
    if (moveBtn) {
      moveBtn.classList.remove('active');
      moveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 2v12M2 8h12"/>
        </svg>
        移動單位
      `;
    }
  }

  /**
   * 顯示路徑模式激活狀態
   */
  _showPathModeActive() {
    const editBtn = document.getElementById('edit-path-btn');
    if (editBtn) {
      editBtn.classList.add('active');
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 10l-4 4m0-4l4 4M2 6l4-4m-4 0l4 4"/>
        </svg>
        完成編輯 (ESC)
      `;
    }
  }

  /**
   * 隱藏路徑模式激活狀態
   */
  _hidePathModeActive() {
    const editBtn = document.getElementById('edit-path-btn');
    if (editBtn) {
      editBtn.classList.remove('active');
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7"/>
          <path d="M10.5 2.5a2.121 2.121 0 0 1 3 3L7 12l-4 1 1-4 6.5-6.5z"/>
        </svg>
        編輯路徑
      `;
    }
  }

  /**
   * 清空屬性面板
   */
  clear() {
    // 清理按鈕事件監聽器
    if (this._btnCleanup) {
      this._btnCleanup();
      this._btnCleanup = null;
    }

    // 清理輸入框事件監聽器
    this._inputCleanup.forEach(cleanup => cleanup());
    this._inputCleanup = [];

    this.currentUnit = null;
    this.currentUnitData = null;

    // 通過 EventBus 隱藏移動路徑
    this.eventBus.emit('ui:hide-move-path');

    this.container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#555" stroke-width="2">
          <circle cx="24" cy="24" r="8"/>
          <path d="M24 4v8m0 24v8M4 24h8m24 0h8"/>
        </svg>
        <p>未選擇單位</p>
        <p class="hint">在 3D 視圖中點擊單位以檢視屬性</p>
      </div>
    `;
  }

  /**
   * 銷毀
   */
  dispose() {
    this.clear();
    // 清理所有事件監聽器
    this._eventCleanup.forEach(cleanup => cleanup());
    this._eventCleanup = [];
  }
}
