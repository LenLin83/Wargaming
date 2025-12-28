/**
 * 前端層 - GUI 控制管理器
 * Frontend Layer - GUI Control Manager
 * 負責：dat.GUI 控制面板
 */

import { eventBus, Events } from '../core/EventBus.js';

export class GUIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.gui = null;
    this.params = {
      // 符號設置
      symbolHeight: 15,
      showConnectionLines: true,
      connectionLineOpacity: 0.6,

      // 模型設置
      modelSize: 2,

      // 顯示設置
      showSymbols: true,
      showModels: true,
      showLabels: true,

      // 場景設置
      showGrid: true,
      showFog: true,

      // 相機設置
      cameraDistance: 100,

      // 重置
      reset: () => this.resetToDefaults()
    };
  }

  /**
   * 初始化
   */
  async initialize() {
    // 等待 dat.GUI 載入
    if (typeof dat === 'undefined') {
      console.error('dat.GUI 未載入');
      return;
    }

    this.gui = new dat.GUI({ width: 280 });
    this.setupControls();
    console.log('GUI 控制面板已就緒');
  }

  /**
   * 設定控制項
   */
  setupControls() {
    // 符號設置資料夾
    const symbolFolder = this.gui.addFolder('符號設置 (Symbol)');
    symbolFolder.add(this.params, 'symbolHeight', 5, 200)
      .name('符號高度')
      .onChange((value) => this.updateSymbolHeight(value));
    symbolFolder.add(this.params, 'showConnectionLines')
      .name('顯示連接線')
      .onChange((value) => this.updateConnectionLines(value));
    symbolFolder.add(this.params, 'connectionLineOpacity', 0, 1)
      .name('連接線透明度')
      .onChange((value) => this.updateLineOpacity(value));
    symbolFolder.open();

    // 模型設置資料夾
    const modelFolder = this.gui.addFolder('模型設置 (Model)');
    modelFolder.add(this.params, 'modelSize', 0.5, 5)
      .name('模型大小')
      .onChange((value) => this.updateModelSize(value));
    modelFolder.open();

    // 顯示設置資料夾
    const displayFolder = this.gui.addFolder('顯示設置 (Display)');
    displayFolder.add(this.params, 'showSymbols')
      .name('顯示符號')
      .onChange((value) => this.toggleSymbols(value));
    displayFolder.add(this.params, 'showModels')
      .name('顯示模型')
      .onChange((value) => this.toggleModels(value));
    displayFolder.add(this.params, 'showLabels')
      .name('顯示標籤')
      .onChange((value) => this.toggleLabels(value));
    displayFolder.open();

    // 場景設置資料夾
    const sceneFolder = this.gui.addFolder('場景設置 (Scene)');
    sceneFolder.add(this.params, 'showGrid')
      .name('顯示網格')
      .onChange((value) => this.toggleGrid(value));
    sceneFolder.add(this.params, 'showFog')
      .name('顯示霧氣')
      .onChange((value) => this.toggleFog(value));
    sceneFolder.add(this.params, 'cameraDistance', 20, 300)
      .name('相機距離')
      .onChange((value) => this.updateCameraDistance(value));
    sceneFolder.open();

    // 重置按鈕
    this.gui.add(this.params, 'reset').name('重置預設值');
  }

  /**
   * 更新符號高度
   */
  updateSymbolHeight(value) {
    this.eventBus.emit('gui:symbol:height', { height: value });
  }

  /**
   * 更新連接線顯示
   */
  updateConnectionLines(show) {
    this.eventBus.emit('gui:connection:show', { show });
  }

  /**
   * 更新連接線透明度
   */
  updateLineOpacity(value) {
    this.eventBus.emit('gui:connection:opacity', { opacity: value });
  }

  /**
   * 更新模型大小
   */
  updateModelSize(value) {
    this.eventBus.emit('gui:model:size', { size: value });
  }

  /**
   * 切換符號顯示
   */
  toggleSymbols(show) {
    this.eventBus.emit('gui:symbol:toggle', { show });
  }

  /**
   * 切換模型顯示
   */
  toggleModels(show) {
    this.eventBus.emit('gui:model:toggle', { show });
  }

  /**
   * 切換標籤顯示
   */
  toggleLabels(show) {
    this.eventBus.emit('gui:label:toggle', { show });
  }

  /**
   * 切換網格顯示
   */
  toggleGrid(show) {
    this.eventBus.emit('gui:grid:toggle', { show });
  }

  /**
   * 切換霧氣顯示
   */
  toggleFog(show) {
    this.eventBus.emit('gui:fog:toggle', { show });
  }

  /**
   * 更新相機距離
   */
  updateCameraDistance(value) {
    this.eventBus.emit('gui:camera:distance', { distance: value });
  }

  /**
   * 重置為預設值
   */
  resetToDefaults() {
    this.params.symbolHeight = 15;
    this.params.showConnectionLines = true;
    this.params.connectionLineOpacity = 0.6;
    this.params.modelSize = 2;
    this.params.showSymbols = true;
    this.params.showModels = true;
    this.params.showLabels = true;
    this.params.showGrid = true;
    this.params.showFog = true;
    this.params.cameraDistance = 100;

    // 更新 GUI 顯示
    this.gui.updateDisplay();

    // 觸發更新事件
    this.updateSymbolHeight(this.params.symbolHeight);
    this.updateConnectionLines(this.params.showConnectionLines);
    this.updateLineOpacity(this.params.connectionLineOpacity);
    this.updateModelSize(this.params.modelSize);
    this.toggleSymbols(this.params.showSymbols);
    this.toggleModels(this.params.showModels);
    this.toggleLabels(this.params.showLabels);
    this.toggleGrid(this.params.showGrid);
    this.toggleFog(this.params.showFog);
    this.updateCameraDistance(this.params.cameraDistance);

    console.log('已重置為預設值');
  }

  /**
   * 銷毀
   */
  dispose() {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}
