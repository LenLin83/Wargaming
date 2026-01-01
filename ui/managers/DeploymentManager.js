/**
 * UI 層 - 部署管理器
 * UI Layer - Deployment Manager
 * 負責：處理從 ORBAT 樹點擊部署單位到 3D 場景
 */

import * as THREE from 'three';

export class DeploymentManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isDeployMode = false;
    this.deployUnit = null;
    this.customCursor = null;
    this.canvas = null;

    this._setupEventListeners();
  }

  /**
   * 設定事件監聽
   */
  _setupEventListeners() {
    // 監聽進入部署模式事件
    this.eventBus.on('ui:enter-deploy-mode', ({ unit }) => {
      this._enterDeployMode(unit);
    });

    // 監聽退出部署模式事件
    this.eventBus.on('ui:exit-deploy-mode', () => {
      this._exitDeployMode();
    });
  }

  /**
   * 進入部署模式
   */
  async _enterDeployMode(unit) {
    // 如果已在部署模式，先退出
    if (this.isDeployMode) {
      this._exitDeployMode();
    }

    this.isDeployMode = true;
    this.deployUnit = unit;

    // 取得 canvas
    this.canvas = document.getElementById('main-canvas');
    if (!this.canvas) {
      console.error('找不到 main-canvas');
      return;
    }

    // 建立自訂游標（兵棋符號）
    await this._createUnitCursor(unit);

    // 設定游標
    this.canvas.style.cursor = 'none';
    document.body.style.cursor = 'none';

    // 監聽滑鼠移動和點擊
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundClick = this._onCanvasClick.bind(this);
    this._boundKeyDown = this._onKeyDown.bind(this);

    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('click', this._boundClick);
    window.addEventListener('keydown', this._boundKeyDown);

    // 顯示提示
    this._showDeployTooltip();

    console.log(`進入部署模式: ${unit.name} (${unit.sidc})`);
  }

  /**
   * 退出部署模式
   */
  _exitDeployMode() {
    if (!this.isDeployMode) return;

    this.isDeployMode = false;
    this.deployUnit = null;

    // 移除自訂游標
    if (this.customCursor) {
      this.customCursor.remove();
      this.customCursor = null;
    }

    // 恢復游標
    if (this.canvas) {
      this.canvas.style.cursor = '';
    }
    document.body.style.cursor = '';

    // 移除事件監聽
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this._boundMouseMove);
      this.canvas.removeEventListener('click', this._boundClick);
    }
    window.removeEventListener('keydown', this._boundKeyDown);

    // 隱藏提示
    this._hideDeployTooltip();

    console.log('退出部署模式');
  }

  /**
   * 建立單位符號游標
   */
  async _createUnitCursor(unit) {
    if (!window.ms) return;

    // 建立游標元素
    this.customCursor = document.createElement('div');
    this.customCursor.className = 'deploy-cursor';
    this.customCursor.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      transform: translate(-50%, -50%);
      opacity: 0.9;
    `;

    // 使用 milsymbol 生成符號
    const symbol = new window.ms.Symbol(unit.sidc, {
      size: 40
    });

    const symbolCanvas = symbol.asCanvas();
    if (symbolCanvas) {
      this.customCursor.appendChild(symbolCanvas);
    }

    // 添加單位名稱標籤
    const label = document.createElement('div');
    label.className = 'deploy-cursor-label';
    label.textContent = unit.name;
    label.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      white-space: nowrap;
      margin-top: 4px;
    `;
    this.customCursor.appendChild(label);

    document.body.appendChild(this.customCursor);
  }

  /**
   * 滑鼠移動處理
   */
  _onMouseMove(e) {
    if (!this.customCursor) return;

    // 更新游標位置
    this.customCursor.style.left = e.clientX + 'px';
    this.customCursor.style.top = e.clientY + 'px';
  }

  /**
   * Canvas 點擊處理 - 部署單位
   */
  _onCanvasClick(e) {
    if (!this.isDeployMode || !this.deployUnit) return;

    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();

    // 計算歸一化設備座標
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    // 觸發部署事件（讓 App.js 處理 raycast）
    this.eventBus.emit('ui:deploy-unit', {
      unit: this.deployUnit,
      mouse: mouse
    });

    // 部署後退出部署模式
    this._exitDeployMode();
  }

  /**
   * 鍵盤處理
   */
  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this._exitDeployMode();
    }
  }

  /**
   * 顯示部署提示
   */
  _showDeployTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'deploy-tooltip';
    this.tooltip.innerHTML = `
      <div class="deploy-tooltip-content">
        <span class="deploy-tooltip-icon">🎯</span>
        <span class="deploy-tooltip-text">點擊地圖部署單位，按 Esc 取消</span>
      </div>
    `;
    this.tooltip.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 122, 204, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(this.tooltip);
  }

  /**
   * 隱藏部署提示
   */
  _hideDeployTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  /**
   * 銷毀
   */
  dispose() {
    this._exitDeployMode();
  }
}
